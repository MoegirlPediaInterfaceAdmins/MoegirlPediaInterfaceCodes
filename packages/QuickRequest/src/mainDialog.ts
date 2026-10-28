import { parseWikitext } from "./api.ts";
import { findTypeConfig, isGroupSatisfied } from "./config.ts";
import { CONFIG_PAGE, DIALOG_SIZE, MAX_MAIN_BODY_HEIGHT } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";
import { createParamField, readValues, validateFields } from "./fields.ts";
import type { ParamField } from "./fields.ts";
import { buildSubmitText, buildTemplateWikitext } from "./wikitext.ts";
import { showError } from "./messageDialog.ts";
import type {
    ConfigResult,
    MainDialogData,
    PreviewDialogData,
    PreviewSubmission,
    QuickRequestContext,
    RequestTypeDefinition,
    TemplateSpec,
    TypeConfig,
    TypeVariant,
    Warning,
} from "./types.ts";

/** 当前生效的模板规格：无变体类型是类型条目本身，有变体类型是选中的变体。 */
type ActiveSpec = TemplateSpec & Pick<TypeConfig, "requireAnyOf">;

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
    private typeConfig: TypeConfig | null = null;
    /** 当前生效的模板规格：无变体类型即类型条目，有变体类型为选中的变体 */
    private activeSpec: ActiveSpec | null = null;
    private variantInput: OO.ui.DropdownInputWidget | null = null;
    private paramFields: ParamField[] = [];

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
            $("<p>").text(wgULS("正在加载请求配置…", "正在載入請求組態…")),
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
                const { definition, context, configPromise, onPreview, preset } = data as unknown as MainDialogData;
                this.definition = definition;
                this.context = context;
                this.onPreview = onPreview;
                this.preset = preset;
                this.getActions().setAbilities({ preview: false });

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
                    this.buildForm(typeConfig);
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
                const submission = this.collectSubmission();
                if (!submission) {
                    return;
                }

                let previewHtml: string;
                try {
                    // title 传发帖目标页：{{ARTICLEPAGENAME}} 等页面上下文相关魔法字
                    // 必须按目标页解析，预览才与真实保存结果一致
                    previewHtml = await parseWikitext(submission.submittedText, submission.targetPage);
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
     * 构建表单。仅在配置就绪后调用一次。
     * 变体类型（userGroup）额外渲染「申请类型」下拉，参数区随选中变体整体重建。
     * @param typeConfig 类型配置
     */
    private buildForm(typeConfig: TypeConfig): void {
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

        const variants = typeConfig.variants ?? [];
        let initialSpec: ActiveSpec;
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
        } else {
            // 校验保证 template 与 variants 至少一项存在，此处判断同时完成类型收窄
            const template = typeConfig.template;
            if (!template) {
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
     * @param spec 生效的模板规格
     */
    private rebuildParamArea(spec: ActiveSpec): void {
        this.activeSpec = spec;
        this.paramFieldset.clearItems();
        this.paramFields = (spec.parameters ?? []).map((param) => {
            // 初始值优先级：入口预填（preset，如封禁申诉入口查好的封禁信息）＞
            // auto: currentPage（本页名，取代旧的 preloadparams[]/$1 预填）＞ 配置 default
            const presetValue = this.preset?.[param.key];
            const autoValue = param.auto === "currentPage" ? this.context.pageName : undefined;
            const initial = presetValue ?? autoValue ?? param.default;
            const effective = initial === undefined ? param : { ...param, "default": initial };
            return createParamField(
                effective,
                this.$overlay,
                () => { this.onFormChanged(); },
            );
        });
        this.paramFieldset.addItems(this.paramFields.map(({ layout }) => layout));

        const groupLabels = (spec.requireAnyOf ?? [])
            .map((key) => spec.parameters?.find((param) => param.key === key)?.label ?? key);
        this.groupHint.setLabel(groupLabels.length > 0 ? wgULS(`「${groupLabels.join("」「")}」至少填写一项`, `「${groupLabels.join("」「")}」至少填寫一項`) : "");
        this.onFormChanged();
    }

    /** 重算「预览」按钮的可用性，并刷新字段级校验提示与组约束提示。 */
    private onFormChanged(): void {
        if (!this.activeSpec) {
            return;
        }
        const firstInvalid = validateFields(this.paramFields);
        const groupSatisfied = isGroupSatisfied(this.activeSpec, readValues(this.paramFields));
        this.groupHint.toggle(!groupSatisfied);
        this.getActions().setAbilities({ preview: firstInvalid === null && groupSatisfied });
    }

    /**
     * 汇总当前表单，产出待预览/提交的内容。校验不过时返回 null 并给出提示。
     * @returns 待预览/提交的内容
     */
    private collectSubmission(): PreviewSubmission | null {
        const spec = this.activeSpec;
        if (!spec || !this.typeConfig) {
            return null;
        }
        const firstInvalid = validateFields(this.paramFields);
        if (firstInvalid) {
            firstInvalid.widget.focus();
            return null;
        }
        if (!isGroupSatisfied(spec, readValues(this.paramFields))) {
            void showError(wgULS("内容不完整", "內容不完整"), wgULS("请至少填写组内的一项内容。", "請至少填寫組內的一項內容。"));
            return null;
        }

        const values = readValues(this.paramFields);
        const raw = buildTemplateWikitext(spec, values);
        // 判空基线：用户参数全空的输出（固定参数仍在）——而不是裸模板调用
        if (raw === buildTemplateWikitext(spec, {})) {
            void showError(wgULS("内容为空", "內容為空"), wgULS("待发送的内容不能为空。", "待傳送的內容不能為空。"));
            return null;
        }

        const targetPage = this.definition.resolveTarget(this.context);
        if (targetPage === false) {
            void showError(wgULS("无法发起请求", "無法發起請求"), wgULS("当前页面没有对应的讨论页。", "目前頁面沒有對應的討論頁。"));
            return null;
        }

        const sectionTitle = this.definition.sectionTitle;
        return {
            targetPage,
            submittedText: buildSubmitText(raw),
            // 章节标题惰性生成：日期取提交时刻，预览停留跨午夜也不会带前一天的日期发出；
            // append 模式（标题由模板正文自带）不提供
            ...sectionTitle === undefined ? {} : { getSectionTitle: (): string => sectionTitle({ ...this.context, now: new Date() }) },
            ...this.definition.postMode === undefined ? {} : { postMode: this.definition.postMode },
            ...this.definition.allowCreate === undefined ? {} : { allowCreate: this.definition.allowCreate },
            editSummary: this.summaryInput.getValue().trim(),
        };
    }
}

export { MainDialog };
