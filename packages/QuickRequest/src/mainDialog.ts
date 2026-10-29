import { parseWikitext } from "./api.ts";
import { findTypeConfig, isGroupSatisfied } from "./config.ts";
import { CONFIG_PAGE, DIALOG_SIZE, MAX_MAIN_BODY_HEIGHT } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";
import { createParamField, readValues, validateFields } from "./fields.ts";
import type { ParamField } from "./fields.ts";
import { buildSubmitText, buildTemplateWikitext } from "./wikitext.ts";
import { showError } from "./messageDialog.ts";
import { setPreference } from "./storage.ts";
import type {
    ConfigResult,
    MainDialogData,
    PreviewDialogData,
    PreviewSubmission,
    QuickRequestContext,
    RequestParam,
    RequestTypeDefinition,
    TemplateSpec,
    TypeConfig,
    TypeVariant,
    Warning,
} from "./types.ts";

/** 当前生效的表单规格：参数与组约束（配置模板类型与程序化类型共用）。 */
type ActiveSpec = Pick<TemplateSpec, "parameters"> & Pick<TypeConfig, "requireAnyOf">;
/** 配置模板类型的生效规格（含模板调用拼装所需字段）；程序化类型无此形态。 */
type TemplateActiveSpec = ActiveSpec & TemplateSpec;

/**
 * 主对话框：按请求类型展示参数表单与编辑摘要，然后进入预览。
 *
 * 类型配置（站内 JSON 页）在打开时才可用，因此 initialize 只搭出「加载中 / 表单」
 * 两个容器，真正的表单在 getSetupProcess 里等预取落定后再构建。
 */
class MainDialog extends OO.ui.ProcessDialog {
    /**
     * 必须逐项写全：OO.inheritClass 用 Object.create 继承静态成员，
     * { ...OO.ui.ProcessDialog.static } 展开结果是空对象。
     */
    static override static: OO.ui.ProcessDialog.Static = {
        ...OO.ui.ProcessDialog.static,
        name: "quickrequest-main",
        title: wgULS("快速申请", "快速申請"),
        size: DIALOG_SIZE,
        tagName: "div",
        escapable: true,
        actions: [
            { action: "preview", label: wgULS("预览", "預覽"), flags: ["primary", "progressive"] },
            // 没有 action 名：OO.ui.Dialog 会自动关闭对话框
            { label: wgULS("取消", "取消"), flags: ["safe"] },
        ],
    };

    private definition!: RequestTypeDefinition;
    private context!: QuickRequestContext;
    private onPreview: ((data: PreviewDialogData) => void) | undefined;
    /** 入口预填值（封禁申诉的封禁信息等）；无预填的类型为 undefined */
    private preset: Record<string, string> | undefined;
    /** 预览解析所用 API 与目标站基址（delete 在共享站发起时指向主站） */
    private api!: mw.Api;
    private targetBase = "";
    private typeConfig: TypeConfig | null = null;
    /** 当前生效的表单规格（参数与组约束） */
    private activeSpec: ActiveSpec | null = null;
    /** 配置模板类型的模板规格；程序化类型（delete）为 null */
    private templateSpec: TemplateActiveSpec | null = null;
    private variantInput: OO.ui.DropdownInputWidget | null = null;
    private paramFields: ParamField[] = [];
    /** 隐藏字段（hidden 参数）的固定值，键 → 值；随参数区重建 */
    private hiddenValues: Record<string, string> = {};

    private loadingPanel!: OO.ui.PanelLayout;
    private formPanel!: OO.ui.PanelLayout;
    private paramFieldset!: OO.ui.FieldsetLayout;
    private groupHint!: OO.ui.LabelWidget;
    private summaryInput!: OO.ui.TextInputWidget;

    /**
     * 搭出「加载中」与「表单」两个容器，不碰配置（此时类型条目还未知）。
     * @returns 本实例
     */
    public override initialize(): this {
        super.initialize();

        this.loadingPanel = new OO.ui.PanelLayout({ padded: true, expanded: false });
        this.loadingPanel.$element.append(
            new OO.ui.ProgressBarWidget({ progress: false }).$element,
            $("<p>").text(wgULS("正在加载…", "正在載入…")),
        );

        this.formPanel = new OO.ui.PanelLayout({ padded: true, expanded: false, scrollable: true });

        this.$body.append(this.loadingPanel.$element, this.formPanel.$element);
        return this;
    }

    /**
     * 等配置预取落定后把加载态换成表单。
     * 放在 setup 阶段是为了让随后的 updateSize() 按真实表单测量高度。
     * @param data 打开数据
     * @returns 设置流程
     */
    public override getSetupProcess(data?: OO.ui.Dialog.SetupDataMap & Record<string, unknown>): OO.ui.Process {
        return super.getSetupProcess(data).next(
            (async () => {
                const { definition, context, configPromise, onPreview, preset, api, targetBase } = data as unknown as MainDialogData;
                this.definition = definition;
                this.context = context;
                this.onPreview = onPreview;
                this.preset = preset;
                this.api = api;
                this.targetBase = targetBase;
                this.getActions().setAbilities({ preview: false });

                // 程序化表单类型（delete）不经配置页：字段（含动态下拉选项与权限显隐）现取现建
                const programmatic = definition.programmaticForm;
                if (programmatic) {
                    try {
                        const parameters = await programmatic.buildParams(context);
                        this.buildForm({ parameters, ...programmatic.requireAnyOf === undefined ? {} : { requireAnyOf: programmatic.requireAnyOf } }, null);
                    } catch (error) {
                        this.close({ action: "formError", message: toErrorMessage(error) });
                        return;
                    }
                    this.loadingPanel.$element.detach();
                    return;
                }

                // 以下为配置页类型。index 的约定：非程序化类型必带 configPromise；
                // 缺失说明调用方违约，按表单构建失败呈现（同时完成类型收窄）
                if (!configPromise) {
                    this.close({ action: "formError", message: wgULS("缺少配置预取", "缺少組態預取") });
                    return;
                }
                // configPromise 承诺不 reject，catch 只是兜底；步骤内绝不能抛，
                // 一旦 reject，OOUI 会显示它内置的英文错误界面
                const result = await configPromise.catch((error: unknown): ConfigResult => ({ ok: false, message: toErrorMessage(error) }));
                if (!result.ok) {
                    this.close({ action: "configError", message: result.message });
                    return;
                }

                const typeConfig = findTypeConfig(result.config, definition.id);
                if (!typeConfig) {
                    this.close({ action: "configError", message: wgULS(`${CONFIG_PAGE} 缺少 ${definition.id} 类型条目`, `${CONFIG_PAGE} 缺少 ${definition.id} 類型條目`) });
                    return;
                }

                // 表单构建失败与配置无关，单独归因，免得被报成「配置页读取失败」
                try {
                    this.buildForm(null, typeConfig);
                } catch (error) {
                    this.close({ action: "formError", message: toErrorMessage(error) });
                    return;
                }
                this.loadingPanel.$element.detach();
            }) as unknown as OO.ui.Process.Step<this>,
            this,
        );
    }

    /**
     * 处理底部动作：仅拦截 preview，其余交给父类。
     * 不手动 pushPending：OOUI 的 executeAction 已在整个流程（含其中的 await）外挂了一层 pending。
     * @param action 动作名
     * @returns 动作流程
     */
    public override getActionProcess(action?: string): OO.ui.Process {
        if (action !== "preview") {
            return super.getActionProcess(action);
        }
        return new OO.ui.Process(
            (async () => {
                const submission = await this.collectSubmission();
                if (!submission) {
                    return;
                }

                let previewHtml: string;
                try {
                    // title 传发帖目标页：{{ARTICLEPAGENAME}} 等页面上下文相关魔法字
                    // 必须按目标页解析，预览才与真实保存结果一致；API 也按目标站取
                    // （delete 在共享站发起时经 ForeignApi 到主站解析）
                    previewHtml = await parseWikitext(submission.submittedText, submission.targetPage, this.api);
                } catch (error) {
                    void showError(wgULS("预览失败", "預覽失敗"), wgULS(`无法渲染预览：${toErrorMessage(error)}`, `無法產生預覽：${toErrorMessage(error)}`));
                    return;
                }

                const data: PreviewDialogData = {
                    title: wgULS(`预览：${this.definition.label}`, `預覽：${this.definition.label}`),
                    previewHtml,
                    submittedText: submission.submittedText,
                    targetPage: submission.targetPage,
                    ...submission.getSectionTitle === undefined ? {} : { getSectionTitle: submission.getSectionTitle },
                    ...submission.postMode === undefined ? {} : { postMode: submission.postMode },
                    editSummary: submission.editSummary,
                    api: this.api,
                    targetBase: this.targetBase,
                    ...this.definition.warnings === undefined
                        ? {}
                        : { getWarnings: (): Promise<Warning[]> => this.definition.warnings?.(this.context) ?? Promise.resolve([]) },
                };
                this.onPreview?.(data);
            }) as unknown as OO.ui.Process.Step<this>,
            this,
        );
    }

    /**
     * 内容区最大高度，超出则滚动。
     * @returns 高度（px）
     */
    public override getBodyHeight(): number {
        return Math.min(super.getBodyHeight(), MAX_MAIN_BODY_HEIGHT);
    }

    /**
     * 构建表单。仅在类型内容就绪后调用一次（配置类型在预取落定后，程序化类型在 buildParams 落定后）。
     * 变体类型（userGroup）额外渲染「申请类型」下拉，参数区随选中变体整体重建；
     * 程序化类型（delete）无变体与模板，programmaticSpec 即初始规格。
     * @param programmaticSpec 程序化表单的规格；配置页类型传 null
     * @param typeConfig 类型配置；程序化类型传 null
     */
    private buildForm(programmaticSpec: ActiveSpec | null, typeConfig: TypeConfig | null): void {
        this.typeConfig = typeConfig;
        const fieldset = new OO.ui.FieldsetLayout({ label: this.definition.label });

        const targetPage = this.definition.resolveTarget(this.context);
        if (targetPage !== false) {
            fieldset.addItems([
                new OO.ui.FieldLayout(new OO.ui.LabelWidget({ label: targetPage.replace(/_/g, " ") }), {
                    label: wgULS("发至", "發至"),
                    align: "top",
                }),
            ]);
        }

        const variants = typeConfig?.variants ?? [];
        let initialSpec: ActiveSpec | TemplateActiveSpec;
        if (variants.length > 0) {
            this.variantInput = new OO.ui.DropdownInputWidget({
                options: variants.map(({ id, label }) => ({ data: id, label })),
                value: variants[0]?.id,
            });
            this.variantInput.on("change", () => {
                this.rebuildParamArea(this.currentVariant());
            });
            fieldset.addItems([new OO.ui.FieldLayout(this.variantInput, { label: wgULS("申请类型", "申請類型"), align: "top" })]);
            initialSpec = variants[0];
        } else if (programmaticSpec) {
            initialSpec = programmaticSpec;
        } else {
            // 校验保证 template 与 variants 至少一项存在，此处判断同时完成类型收窄
            const template = typeConfig?.template;
            if (!typeConfig || !template) {
                throw new Error(wgULS("类型配置既无模板也无变体", "類型組態既無模板也無變體"));
            }
            initialSpec = {
                template,
                ...typeConfig.parameters === undefined ? {} : { parameters: typeConfig.parameters },
                ...typeConfig.requireAnyOf === undefined ? {} : { requireAnyOf: typeConfig.requireAnyOf },
                ...typeConfig.fixedParams === undefined ? {} : { fixedParams: typeConfig.fixedParams },
            };
        }

        this.paramFieldset = new OO.ui.FieldsetLayout();
        fieldset.addItems([this.paramFieldset]);

        // 组约束不指向单个控件，以整组提示呈现（文案随变体重建）
        this.groupHint = new OO.ui.LabelWidget({ label: "" });
        this.groupHint.$element.css("color", "#d33");
        fieldset.addItems([this.groupHint]);

        this.summaryInput = new OO.ui.TextInputWidget({ value: this.definition.defaultSummary ?? "", placeholder: wgULS("留空则自动生成", "留空則自動生成") });
        fieldset.addItems([new OO.ui.FieldLayout(this.summaryInput, { label: wgULS("编辑摘要", "編輯摘要"), align: "top" })]);

        this.formPanel.$element.append(fieldset.$element);
        this.rebuildParamArea(initialSpec);

        // 确认项（方针修改提醒等）在表单出现时即以横幅告知，不等到提交才拦；
        // 提交前的逐条确认仍保留（previewDialog）。横幅只展示正文，标题（如「提醒」）信息量低不重复
        void this.definition.warnings?.(this.context).then((warnings) => {
            for (const warning of warnings) {
                this.formPanel.$element.prepend(new OO.ui.MessageWidget({ type: "warning", label: warning.message }).$element);
            }
        });
    }

    /**
     * 当前选中的变体。仅变体类型调用（variantInput 已存在）。
     * @returns 选中的变体；下拉值异常时回退首个
     */
    private currentVariant(): TypeVariant {
        const variants = this.typeConfig?.variants ?? [];
        return variants.find((variant) => variant.id === this.variantInput?.getValue()) ?? variants[0];
    }

    /**
     * 按模板规格重建参数区与组约束提示。初次构建与变体切换共用；
     * 切换变体时已填内容不保留——各变体字段结构不同，保留无意义。
     * @param spec 生效的表单规格
     */
    private rebuildParamArea(spec: ActiveSpec): void {
        this.activeSpec = spec;
        // 配置模板类型才有模板规格；程序化类型（delete）的正文不经 buildTemplateWikitext
        this.templateSpec = Reflect.has(spec, "template") ? spec as TemplateActiveSpec : null;
        this.paramFieldset.clearItems();
        // 初始值优先级：入口预填（preset，如封禁申诉入口查好的封禁信息）＞
        // auto: currentPage（本页名，取代旧的 preloadparams[]/$1 预填）＞ 配置 default
        const initialValue = (param: RequestParam): string | undefined => {
            const presetValue = this.preset?.[param.key];
            const autoValue = param.auto === "currentPage" ? this.context.pageName : undefined;
            return presetValue ?? autoValue ?? param.default;
        };
        // 隐藏字段（hidden）不渲染控件，值固定为初始值、随提交一并带出
        // （move 的 original——对齐原生移动表单不显示源页面名）
        this.hiddenValues = Object.fromEntries((spec.parameters ?? [])
            .filter((param) => param.hidden === true)
            .map((param) => [param.key, initialValue(param) ?? ""] as const));
        this.paramFields = (spec.parameters ?? []).filter((param) => param.hidden !== true).map((param) => {
            const initial = initialValue(param);
            const effective = initial === undefined ? param : { ...param, "default": initial };
            return createParamField(
                effective,
                this.$overlay,
                () => {
                    this.persistPreferences();
                    this.onFormChanged();
                },
                () => {
                    this.onEnterKey();
                },
            );
        });
        this.paramFieldset.addItems(this.paramFields.map(({ layout }) => layout));

        const groupLabels = (spec.requireAnyOf ?? [])
            .map((key) => spec.parameters?.find((param) => param.key === key)?.label ?? key);
        this.groupHint.setLabel(groupLabels.length > 0 ? wgULS(`「${groupLabels.join("」「")}」至少填写一项`, `「${groupLabels.join("」「")}」至少填寫一項`) : "");
        this.onFormChanged();
    }

    /** 当前表单全量值：隐藏字段的固定值 + 可见控件的当前值。 */
    private collectValues(): Record<string, string> {
        return { ...this.hiddenValues, ...readValues(this.paramFields) };
    }

    /** 按 visibleIf 刷新字段可见性；隐藏字段不参与校验，值仍随表单传出。 */
    private applyFieldVisibility(): void {
        const values = this.collectValues();
        for (const field of this.paramFields) {
            const rule = field.param.visibleIf;
            if (rule) {
                field.hidden = values[rule.param] !== rule.equals;
                field.layout.toggle(!field.hidden);
            }
        }
    }

    /**
     * 把带 storageKey 的字段当前值写入持久存储（QuickRequest 键）。
     * 只在值变化回调里调用——表单初始化不触发 change 事件，旧键回退值不会被误写进新键。
     */
    private persistPreferences(): void {
        for (const { param, read } of this.paramFields) {
            if (param.storageKey !== undefined) {
                setPreference(param.storageKey, read());
            }
        }
    }

    /** enterSubmits 字段的回车回调：表单内任一 storageKey 偏好开启时，回车直达「预览」。 */
    private onEnterKey(): void {
        const enabled = this.paramFields.some(({ param, read }) => param.storageKey !== undefined && read() === "1");
        if (enabled) {
            void this.executeAction("preview");
        }
    }

    /** 重算「预览」按钮的可用性，并刷新可见性、字段级校验提示与组约束提示。 */
    private onFormChanged(): void {
        if (!this.activeSpec) {
            return;
        }
        this.applyFieldVisibility();
        const firstInvalid = validateFields(this.paramFields);
        const groupSatisfied = isGroupSatisfied(this.activeSpec, this.collectValues());
        this.groupHint.toggle(!groupSatisfied);
        this.getActions().setAbilities({ preview: firstInvalid === null && groupSatisfied });
    }

    /**
     * 汇总当前表单，产出待预览/提交的内容。校验不过时返回 null 并给出提示。
     * 程序化表单（delete）的正文由 buildBody 异步构建，批量清单的解析校验以抛错表达、在此捕获呈现。
     * @returns 待预览/提交的内容
     */
    private async collectSubmission(): Promise<PreviewSubmission | null> {
        const spec = this.activeSpec;
        if (!spec) {
            return null;
        }
        const firstInvalid = validateFields(this.paramFields);
        if (firstInvalid) {
            firstInvalid.focus?.();
            return null;
        }
        const values = this.collectValues();
        if (!isGroupSatisfied(spec, values)) {
            void showError(wgULS("内容不完整", "內容不完整"), wgULS("请至少填写组内的一项内容。", "請至少填寫組內的一項內容。"));
            return null;
        }
        // 类型级校验（跨字段组合，如移动到自身）：返回文案即拦下
        const validationError = this.definition.validate?.(values, this.context) ?? null;
        if (validationError !== null) {
            void showError(wgULS("无法发起请求", "無法發起請求"), validationError);
            return null;
        }

        const programmatic = this.definition.programmaticForm;
        let submittedText: string;
        if (programmatic) {
            try {
                submittedText = await programmatic.buildBody(values, this.context);
            } catch (error) {
                void showError(wgULS("内容不完整", "內容不完整"), toErrorMessage(error));
                return null;
            }
        } else {
            if (!this.templateSpec) {
                return null;
            }
            const raw = buildTemplateWikitext(this.templateSpec, values);
            // 判空基线：用户参数全空的输出（固定参数仍在）——而不是裸模板调用
            if (raw === buildTemplateWikitext(this.templateSpec, {})) {
                void showError(wgULS("内容为空", "內容為空"), wgULS("待发送的内容不能为空。", "待傳送的內容不能為空。"));
                return null;
            }
            submittedText = buildSubmitText(raw);
        }

        const targetPage = this.definition.resolveTarget(this.context);
        if (targetPage === false) {
            void showError(wgULS("无法发起请求", "無法發起請求"), wgULS("当前页面没有对应的讨论页。", "目前頁面沒有對應的討論頁。"));
            return null;
        }

        const sectionTitle = this.definition.sectionTitle;
        // 章节标题惰性生成：日期取提交时刻，预览停留跨午夜也不会带前一天的日期发出；
        // append 模式（标题由模板正文自带）不提供；程序化类型按表单值区分（单页/批量）
        const getSectionTitle = programmatic !== undefined
            ? (): string => programmatic.buildSectionTitle(values, { ...this.context, now: new Date() })
            : sectionTitle !== undefined
                ? (): string => sectionTitle({ ...this.context, now: new Date() })
                : undefined;
        return {
            targetPage,
            submittedText,
            ...getSectionTitle === undefined ? {} : { getSectionTitle },
            ...this.definition.postMode === undefined ? {} : { postMode: this.definition.postMode },
            ...this.definition.allowCreate === undefined ? {} : { allowCreate: this.definition.allowCreate },
            editSummary: this.summaryInput.getValue().trim(),
        };
    }
}

export { MainDialog };
