import { fetchPageContentOrThrow, parseWikitext } from "./api.ts";
import { findTemplate, getSignatureSuffix } from "./config.ts";
import { DIALOG_SIZE, MAX_MAIN_BODY_HEIGHT, talkPageTitle } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";
import { createParamField, readValues, validateFields } from "./fields.ts";
import type { ParamField } from "./fields.ts";
import { loadPersisted, savePersisted } from "./storage.ts";
import { buildPresetWikitext, buildSubmitText, stripNoInclude } from "./wikitext.ts";
import { showError } from "./messageDialog.ts";
import type { ConfigResult, MainDialogData, PreviewDialogData, PreviewSubmission, TemplateEntry, UserMessagesConfig } from "./types.ts";

/**
 * 主对话框：选择模板、填写参数（或自定义内容）、填写编辑摘要，然后进入预览。
 *
 * 模板列表在打开时才可用，因此 initialize 只搭出「加载中 / 表单」两个容器，
 * 真正的表单在 getSetupProcess 里等预取落定后再构建。
 */
class MainDialog extends OO.ui.ProcessDialog {
    /**
     * 必须逐项写全：OO.inheritClass 用 Object.create 继承静态成员，
     * { ...OO.ui.ProcessDialog.static } 展开结果是空对象。
     */
    static override static: OO.ui.ProcessDialog.Static = {
        ...OO.ui.ProcessDialog.static,
        name: "usermessages-main",
        title: wgULS("向用户发送提醒", "向使用者傳送提醒"),
        size: DIALOG_SIZE,
        tagName: "div",
        escapable: true,
        actions: [
            { action: "preview", label: wgULS("预览", "預覽"), flags: ["primary", "progressive"] },
            // 没有 action 名：OO.ui.Dialog 会自动关闭对话框
            { label: "取消", flags: ["safe"] },
        ],
    };

    private targetUser = "";
    private onPreview: ((data: PreviewDialogData) => void) | undefined;
    private selected: TemplateEntry | null = null;
    private paramFields: ParamField[] = [];
    private customMode = false;
    private loadingCustom = false;

    private loadingPanel!: OO.ui.PanelLayout;
    private formPanel!: OO.ui.PanelLayout;
    private templateDropdown!: OO.ui.DropdownWidget;
    private customCheckbox!: OO.ui.CheckboxInputWidget;
    private customStatus!: OO.ui.LabelWidget;
    private paramFieldset!: OO.ui.FieldsetLayout;
    private customPanel!: OO.ui.PanelLayout;
    private customInput!: OO.ui.MultilineTextInputWidget;
    private summaryInput!: OO.ui.TextInputWidget;

    /**
     * 搭出「加载中」与「表单」两个容器，不碰配置（此时模板列表还未知）。
     * @returns 本实例
     */
    public override initialize(): this {
        super.initialize();

        this.loadingPanel = new OO.ui.PanelLayout({ padded: true, expanded: false });
        this.loadingPanel.$element.append(
            new OO.ui.ProgressBarWidget({ progress: false }).$element,
            $("<p>").text(wgULS("正在加载模板列表…", "正在載入模板列表…")),
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
                const { targetUser, configPromise, onPreview } = data as unknown as MainDialogData;
                this.targetUser = targetUser;
                this.onPreview = onPreview;
                this.getActions().setAbilities({ preview: false });

                // configPromise 承诺不 reject，catch 只是兜底；步骤内绝不能抛，
                // 一旦 reject，OOUI 会显示它内置的英文错误界面
                const result = await configPromise.catch((error: unknown): ConfigResult => ({ ok: false, message: toErrorMessage(error) }));
                if (!result.ok) {
                    this.close({ action: "configError", message: result.message });
                    return;
                }

                // 表单构建失败与配置无关，单独归因，免得被报成「配置页读取失败」
                try {
                    this.buildForm(result.config);
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
                    previewHtml = await parseWikitext(
                        submission.submittedText,
                        talkPageTitle(submission.targetUser),
                    );
                } catch (error) {
                    void showError(wgULS("预览失败", "預覽失敗"), wgULS(`无法渲染预览：${toErrorMessage(error)}`, `無法產生預覽：${toErrorMessage(error)}`));
                    return;
                }

                const data: PreviewDialogData = {
                    title: wgULS(`预览：${submission.templateTitle}`, `預覽：${submission.templateTitle}`),
                    targetUser: submission.targetUser,
                    previewHtml,
                    submittedText: submission.submittedText,
                    editSummary: submission.editSummary,
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
     * @param config 已校验的模板配置
     */
    private buildForm(config: UserMessagesConfig): void {
        const persisted = loadPersisted();
        const find = (title: string): TemplateEntry | undefined => findTemplate(config, title);
        const fieldset = new OO.ui.FieldsetLayout({ label: wgULS("发送提醒", "傳送提醒") });

        this.templateDropdown = new OO.ui.DropdownWidget({
            // 未选中时显示的占位文案
            label: wgULS("请选择模板", "請選擇模板"),
            // 菜单渲染进窗口 overlay，否则会被窗口 body 的滚动容器裁剪
            $overlay: this.$overlay,
            menu: {
                items: config.templates.map(
                    (entry) => new OO.ui.MenuOptionWidget({ data: entry.title, label: entry.title }),
                ),
            },
        });
        this.templateDropdown.getMenu().on("select", (items) => {
            const item = (Array.isArray(items) ? items[0] : items) as OO.ui.MenuOptionWidget | undefined;
            if (!item) {
                return;
            }
            const template = find(String(item.getData()));
            if (template) {
                this.applyTemplate(template);
            }
        });
        fieldset.addItems([new OO.ui.FieldLayout(this.templateDropdown, { label: wgULS("选择模板", "選擇模板"), align: "top" })]);

        fieldset.addItems([
            new OO.ui.FieldLayout(new OO.ui.LabelWidget({ label: this.targetUser }), {
                label: wgULS("目标用户", "目標使用者"),
                align: "top",
            }),
        ]);

        this.customCheckbox = new OO.ui.CheckboxInputWidget({ selected: false });
        this.customCheckbox.on("change", () => {
            if (this.customCheckbox.isSelected()) {
                void this.loadCustomSource();
                return;
            }
            this.setCustomMode(false);
            this.onFormChanged();
            this.updateSize();
        });
        this.customStatus = new OO.ui.LabelWidget({ label: "" });
        fieldset.addItems([
            new OO.ui.FieldLayout(this.customCheckbox, { label: wgULS("自定义内容", "自訂內容"), align: "inline" }),
            this.customStatus,
        ]);

        this.paramFieldset = new OO.ui.FieldsetLayout();
        fieldset.addItems([this.paramFieldset]);

        this.customInput = new OO.ui.MultilineTextInputWidget({ rows: 8, autosize: true, maxRows: 20 });
        this.customInput.on("change", () => {
            this.onFormChanged();
        });
        this.customPanel = new OO.ui.PanelLayout({ padded: false, expanded: false });
        this.customPanel.$element.append(
            new OO.ui.FieldLayout(this.customInput, { label: wgULS("自定义内容", "自訂內容"), align: "top" }).$element,
        );
        this.customPanel.toggle(false);
        fieldset.addItems([this.customPanel]);

        this.summaryInput = new OO.ui.TextInputWidget({ value: persisted.editSummary });
        this.summaryInput.on("change", () => {
            savePersisted({ editSummary: this.summaryInput.getValue() });
        });
        fieldset.addItems([new OO.ui.FieldLayout(this.summaryInput, { label: wgULS("编辑摘要", "編輯摘要"), align: "top" })]);

        this.formPanel.$element.append(fieldset.$element);

        const restored = persisted.templateTitle ? find(persisted.templateTitle) : undefined;
        if (restored) {
            this.templateDropdown.getMenu().selectItemByData(restored.title);
            this.applyTemplate(restored);
            // applyTemplate 会填入模板默认摘要，那会把用户上次改过的摘要冲掉；此处按持久化值回填
            // （setValue 会触发 change 处理器，顺带把它写回存储）
            if (persisted.editSummary !== "") {
                this.summaryInput.setValue(persisted.editSummary);
            }
        } else {
            this.onFormChanged();
        }
    }

    /**
     * 在「预置参数」与「自定义内容」两套界面之间切换。
     * @param enabled 是否切到自定义内容
     */
    private setCustomMode(enabled: boolean): void {
        this.customMode = enabled;
        this.customCheckbox.setSelected(enabled);
        this.customPanel.toggle(enabled);
        this.paramFieldset.toggle(!enabled);
    }

    /**
     * 切换到某个模板：重置自定义模式、重建参数区、重新填入摘要。
     * @param template 选中的模板
     */
    private applyTemplate(template: TemplateEntry): void {
        this.selected = template;
        this.setCustomMode(false);
        this.customInput.setValue("");

        this.paramFields = (template.parameters ?? []).map((param) =>
            createParamField(param, this.$overlay, () => { this.onFormChanged(); }),
        );
        this.paramFieldset.clearItems();
        this.paramFieldset.addItems(this.paramFields.map(({ layout }) => layout));

        this.summaryInput.setValue(template.summary);
        savePersisted({ templateTitle: template.title, editSummary: template.summary });

        this.onFormChanged();
        // 参数数量变化，且此处已在 setup 之后，没有别的地方会重算框架高度
        this.updateSize();
    }

    /** 按当前模式重算「预览」按钮的可用性，并刷新字段级校验提示。 */
    private onFormChanged(): void {
        if (this.customMode) {
            this.getActions().setAbilities({ preview: this.customInput.getValue().trim() !== "" });
            return;
        }
        const firstInvalid = validateFields(this.paramFields);
        this.getActions().setAbilities({ preview: this.selected !== null && firstInvalid === null });
    }

    /**
     * 勾选自定义内容后拉取所选中模板的源码。
     * 失败则回退到预置模式（取消勾选并恢复参数表单）。
     * @returns 完成时兑现
     */
    private async loadCustomSource(): Promise<void> {
        const template = this.selected;
        if (!template || this.loadingCustom) {
            return;
        }

        this.loadingCustom = true;
        this.customCheckbox.setDisabled(true);
        this.customStatus.setLabel(wgULS(`正在加载 ${template.template}…`, `正在載入 ${template.template}…`));

        try {
            const source = await fetchPageContentOrThrow(template.template);
            // 等待期间用户可以改选模板，此时 selected 已换人：这次结果属于旧模板，丢弃
            if (template !== this.selected) {
                return;
            }
            this.customInput.setValue(stripNoInclude(source));
            this.setCustomMode(true);
        } catch (error) {
            // 同上：错误的归因也已过期，别拿旧模板的名字去打扰用户当前的选择
            if (template !== this.selected) {
                return;
            }
            this.setCustomMode(false);
            void showError(wgULS("加载失败", "載入失敗"), wgULS(`无法加载 ${template.template} 的源代码：${toErrorMessage(error)}`, `無法載入 ${template.template} 的原始碼：${toErrorMessage(error)}`));
        } finally {
            this.loadingCustom = false;
            this.customCheckbox.setDisabled(false);
            this.customStatus.setLabel("");
            this.onFormChanged();
            this.updateSize();
        }
    }

    /**
     * 汇总当前表单，产出待预览/提交的内容。校验不过时返回 null 并给出提示。
     * @returns 待预览/提交的内容
     */
    private collectSubmission(): PreviewSubmission | null {
        if (!this.selected) {
            void showError(wgULS("未选择模板", "未選擇模板"), wgULS("请先选择一个提醒模板。", "請先選擇一個提醒模板。"));
            return null;
        }

        if (!this.customMode) {
            const firstInvalid = validateFields(this.paramFields);
            if (firstInvalid) {
                firstInvalid.widget.focus();
                return null;
            }
        }

        const raw = this.customMode
            ? this.customInput.getValue().trim()
            : buildPresetWikitext(this.selected, readValues(this.paramFields));
        if (raw === "") {
            void showError(wgULS("内容为空", "內容為空"), wgULS("待发送的内容不能为空。", "待傳送的內容不能為空。"));
            return null;
        }

        return {
            targetUser: this.targetUser,
            submittedText: buildSubmitText(raw, this.customMode, getSignatureSuffix()),
            editSummary: this.summaryInput.getValue(),
            templateTitle: this.selected.title,
        };
    }
}

export { MainDialog };
