import { DIALOG_SIZE, MAX_PREVIEW_BODY_HEIGHT } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";
import { confirmAmbiguousRetry, confirmContinue, confirmRetry, showError } from "./messageDialog.ts";
import { fetchLastSectionAnchor, appendTopic, postTopic } from "./send.ts";
import type { PreviewDialogData, Warning } from "./types.ts";

/**
 * 预览对话框：展示 action=parse 渲染出的 HTML，可折叠查看待提交正文，并执行提交。
 *
 * 提交流程：先过该类型的确认项（如方针修改提醒，逐条「继续提交 / 返回修改」），
 * 再发帖；发送失败时本对话框保持开启、输入原样保留，「重试」直接在同一流程内重新提交。
 */
class PreviewDialog extends OO.ui.ProcessDialog {
    /** 见 MainDialog 中关于 static 必须写全的说明。 */
    static override static: OO.ui.ProcessDialog.Static = {
        ...OO.ui.ProcessDialog.static,
        name: "quickrequest-preview",
        title: wgULS("预览", "預覽"),
        size: DIALOG_SIZE,
        tagName: "div",
        escapable: true,
        actions: [
            { action: "send", label: wgULS("提交请求", "提交請求"), flags: ["primary", "progressive"] },
            { action: "back", label: wgULS("返回", "返回"), flags: ["safe"] },
        ],
    };

    private payload: PreviewDialogData | null = null;
    private getWarnings: (() => Promise<Warning[]>) | undefined;
    private sending = false;

    private htmlPanel!: OO.ui.PanelLayout;
    private contentPanel!: OO.ui.PanelLayout;
    private wikitextToggle!: OO.ui.ToggleButtonWidget;
    private wikitextInput!: OO.ui.MultilineTextInputWidget;
    private wikitextLayout!: OO.ui.FieldLayout<OO.ui.MultilineTextInputWidget>;

    /**
     * 搭出预览区与可折叠的 wikitext 区。
     * @returns 本实例
     */
    public override initialize(): this {
        super.initialize();

        this.htmlPanel = new OO.ui.PanelLayout({ padded: true, expanded: false });

        this.wikitextInput = new OO.ui.MultilineTextInputWidget({
            value: "",
            readOnly: true,
            rows: 8,
            autosize: true,
            maxRows: 16,
        });
        this.wikitextLayout = new OO.ui.FieldLayout(this.wikitextInput, {
            label: wgULS("待提交的 wikitext", "待提交的 wikitext"),
            align: "top",
        });
        this.wikitextToggle = new OO.ui.ToggleButtonWidget({ label: wgULS("显示待提交的 wikitext", "顯示待提交的 wikitext"), value: false });
        this.wikitextToggle.on("change", () => {
            const expanded = this.wikitextToggle.getValue();
            this.wikitextToggle.setLabel(expanded
                ? wgULS("隐藏待提交的 wikitext", "隱藏待提交的 wikitext")
                : wgULS("显示待提交的 wikitext", "顯示待提交的 wikitext"));
            this.wikitextLayout.toggle(expanded);
            // 折叠区展开会改变内容高度，需要重算框架尺寸
            this.updateSize();
        });

        this.contentPanel = new OO.ui.PanelLayout({ padded: false, expanded: false, scrollable: true });
        this.contentPanel.$element.append(
            this.htmlPanel.$element,
            this.wikitextToggle.$element,
            this.wikitextLayout.$element,
        );
        this.$body.append(this.contentPanel.$element);
        return this;
    }

    /**
     * 从打开数据里取出渲染结果、发送参数与确认项提供者。
     * @param data 打开数据
     * @returns 设置流程
     */
    public override getSetupProcess(data?: OO.ui.Dialog.SetupDataMap & Record<string, unknown>): OO.ui.Process {
        return super.getSetupProcess(data).next(() => {
            const payload = data as unknown as PreviewDialogData;
            this.htmlPanel.$element.html(payload.previewHtml);
            this.wikitextInput.setValue(payload.submittedText);
            this.wikitextToggle.setValue(false);
            this.wikitextLayout.toggle(false);
            this.getActions().setAbilities({ send: true });
            this.payload = payload;
            this.getWarnings = payload.getWarnings;
        }, this);
    }

    /**
     * 内容已插入可见 DOM 后再触发 wikipage.content，
     * 让 <gallery>、折叠元素等依赖 JS 初始化的内容在预览里也能正常工作。
     * @param data 打开数据
     * @returns 就绪流程
     */
    public override getReadyProcess(data?: OO.ui.Dialog.SetupDataMap & Record<string, unknown>): OO.ui.Process {
        return super.getReadyProcess(data).next(() => {
            mw.hook("wikipage.content").fire(this.htmlPanel.$element);
        }, this);
    }

    /**
     * 处理底部动作：拦截 back 与 send，其余交给父类。
     * @param action 动作名
     * @returns 动作流程
     */
    public override getActionProcess(action?: string): OO.ui.Process {
        if (action === "back") {
            return new OO.ui.Process(() => {
                this.close({ action: "back" });
            }, this);
        }
        if (action !== "send") {
            return super.getActionProcess(action);
        }
        return new OO.ui.Process(
            (async () => {
                const payload = this.payload;
                if (this.sending || !payload) {
                    return;
                }
                this.setSending(true);
                try {
                    // 确认项逐条过：任何一条选择「返回修改」即中止，表单原样保留
                    const warnings = this.getWarnings === undefined ? [] : await this.getWarnings();
                    for (const warning of warnings) {
                        if (await confirmContinue(warning.title, warning.message) !== "continue") {
                            this.setSending(false);
                            return;
                        }
                    }
                    // append 模式正文自带章节标题；addtopic 的标题（含日期）在此刻生成，日期取提交时刻
                    const append = payload.postMode === "append";
                    const sectionTitle = append ? "" : payload.getSectionTitle?.() ?? "";
                    for (;;) {
                        const result = append
                            ? await appendTopic({
                                page: payload.targetPage,
                                wikitext: payload.submittedText,
                                summary: payload.editSummary,
                                ...payload.allowCreate === undefined ? {} : { allowCreate: payload.allowCreate },
                                api: payload.api,
                            })
                            : await postTopic({
                                page: payload.targetPage,
                                sectionTitle,
                                wikitext: payload.submittedText,
                                summary: payload.editSummary,
                                api: payload.api,
                            });
                        if (result.ok) {
                            // 锚点必须在关框前回读：用户看到的是连续的「正在提交…」，而不是框已关闭却在干等
                            const anchor = await fetchLastSectionAnchor(result.newrevid, append ? undefined : sectionTitle, payload.api);
                            // 对话框即将关闭，无需恢复按钮状态
                            this.close({ action: "sent", anchor });
                            return;
                        }
                        // 传输层失败结果未知（请求可能已提交），换警示文案、不默认引导重试
                        const choice = result.ambiguous
                            ? await confirmAmbiguousRetry(wgULS("发送结果未知", "發送結果未知"), result.detail)
                            : await confirmRetry(wgULS("发送失败", "傳送失敗"), result.detail);
                        if (choice !== "retry") {
                            this.setSending(false);
                            return;
                        }
                    }
                } catch (error) {
                    // 步骤内绝不能抛：一旦 reject，OOUI 会显示它内置的英文错误界面
                    this.setSending(false);
                    void showError(wgULS("发送失败", "傳送失敗"), toErrorMessage(error));
                }
            }) as unknown as OO.ui.Process.Step<this>,
            this,
        );
    }

    /**
     * 内容区最大高度，超出则滚动。
     * @returns 高度（px）
     */
    public override getBodyHeight(): number {
        return Math.min(super.getBodyHeight(), MAX_PREVIEW_BODY_HEIGHT);
    }

    /**
     * 提交中禁用两个按钮并改文案，防止重复投递。
     * @param sending 是否正在提交
     */
    private setSending(sending: boolean): void {
        this.sending = sending;
        this.getActions().setAbilities({ send: !sending, back: !sending });
        this.getActions()
            .get({ actions: "send" })
            .at(0)
            ?.setLabel(sending ? wgULS("正在提交…", "正在提交…") : wgULS("提交请求", "提交請求"));
    }
}

export { PreviewDialog };
