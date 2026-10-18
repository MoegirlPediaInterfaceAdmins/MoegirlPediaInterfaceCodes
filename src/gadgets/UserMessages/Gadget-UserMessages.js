/**
 * 本文件由 packages/UserMessages 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value);

// packages/UserMessages/src/constants.ts
var CONFIG_PAGE = "MediaWiki:Gadget-UserMessages.json", STORAGE_KEY = "usermessages-state", DIALOG_SIZE = "large";
var ALLOWED_NAMESPACES = [2, 3, -1], ALLOWED_SPECIAL_PAGES = ["Contributions", "DeletedContributions", "Block", "Log"], DEFAULT_SIGNATURE_SUFFIX = " ——~~~~", talkPageTitle = (user) => `User talk:${user}`;

// packages/UserMessages/src/errors.ts
var toErrorMessage = (error) => error instanceof Error ? error.message : String(error), ERROR_MESSAGES = {
  badtoken: wgULS("登录令牌已失效，请刷新页面后重试。", "登入權杖已失效，請重新整理頁面後再試。"),
  assertnameduserfailed: wgULS("当前登录状态已失效（可能已在别处退出登录），请刷新页面后重新登录。", "目前登入狀態已失效（可能已在別處登出），請重新整理頁面後重新登入。"),
  ratelimited: wgULS("操作过于频繁，已被限流，请稍后再试。", "操作過於頻繁，已受到頻率限制，請稍後再試。"),
  permissiondenied: wgULS("权限不足，无法编辑该讨论页。", "權限不足，無法編輯該討論頁。"),
  blocked: wgULS("您当前的账号或 IP 已被封禁，无法编辑。", "您目前的帳號或 IP 已被封鎖，無法編輯。"),
  spamdetected: wgULS("内容被滥用过滤器判定为垃圾信息，已被拒绝。", "內容被濫用過濾器判定為垃圾資訊，已被拒絕。"),
  articleexists: wgULS("目标页面已存在，无法新建。", "目標頁面已存在，無法建立。"),
  readonly: wgULS("本站当前处于只读状态，暂时无法编辑。", "本站目前處於唯讀狀態，暫時無法編輯。")
}, extractInfo = (result) => typeof result != "object" || result === null ? "" : result.error?.info ?? result.errors?.[0]?.info ?? "", describeSendError = (code, result) => {
  let info = extractInfo(result), known = Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : void 0;
  return known ? info ? `${known}（${info}）` : known : code.startsWith("abusefilter") ? wgULS(`被滥用过滤器阻止（${code}）${info ? `：${info}` : ""}`, `被濫用過濾器阻止（${code}）${info ? `：${info}` : ""}`) : wgULS(`发送失败（${code}）${info ? `：${info}` : ""}`, `傳送失敗（${code}）${info ? `：${info}` : ""}`);
};

// packages/UserMessages/src/api.ts
var api = new mw.Api(), fetchPageContent = async (title) => (await api.post({
  action: "query",
  titles: title,
  prop: "revisions",
  rvprop: "content",
  formatversion: 2
})).query?.pages?.[0]?.revisions?.[0]?.content ?? "", fetchPageContentOrThrow = async (title) => {
  let content = await fetchPageContent(title);
  if (content.trim() === "")
    throw new Error(wgULS(`页面 ${title} 不存在或内容为空`, `頁面 ${title} 不存在或內容為空`));
  return content;
}, parseWikitext = async (wikitext, title) => (await api.post({
  action: "parse",
  title,
  text: wikitext,
  contentmodel: "wikitext",
  pst: !0,
  disablelimitreport: !0,
  formatversion: 2,
  wrapoutputclass: "mw-parser-output"
})).parse?.text ?? "";

// packages/UserMessages/src/config.ts
var PARAM_TYPES = /* @__PURE__ */ new Set(["page", "user", "text", "multiline"]), isParamType = (value) => typeof value == "string" && PARAM_TYPES.has(value), compact = (items) => items.filter((item) => item !== null), prefetch = null, settled = null, isNonEmptyString = (value) => typeof value == "string" && value.trim() !== "", toTemplateParam = (raw) => {
  if (typeof raw != "object" || raw === null)
    return null;
  let { key, label, type, required, default: defaultValue } = raw;
  if (!isNonEmptyString(key) || !isNonEmptyString(label))
    return null;
  let param = { key, label };
  return isParamType(type) && (param.type = type), typeof required == "boolean" && (param.required = required), typeof defaultValue == "string" && (param.default = defaultValue), param;
}, toTemplateEntry = (raw) => {
  if (typeof raw != "object" || raw === null)
    return null;
  let { title, template, summary, parameters } = raw;
  if (!isNonEmptyString(title) || !isNonEmptyString(template))
    return null;
  let entry = {
    title,
    template,
    summary: typeof summary == "string" ? summary : ""
  };
  return Array.isArray(parameters) && (entry.parameters = compact(parameters.map(toTemplateParam))), entry;
}, parseConfig = (raw) => {
  if (raw.trim() === "")
    return { ok: !1, message: wgULS(`页面 ${CONFIG_PAGE} 不存在或内容为空`, `頁面 ${CONFIG_PAGE} 不存在或內容為空`) };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: !1, message: wgULS(`JSON 解析失败：${toErrorMessage(error)}`, `JSON 解析失敗：${toErrorMessage(error)}`) };
  }
  let templates = parsed?.templates;
  if (!Array.isArray(templates))
    return { ok: !1, message: wgULS(`${CONFIG_PAGE} 缺少 templates 数组`, `${CONFIG_PAGE} 缺少 templates 陣列`) };
  let valid = compact(templates.map(toTemplateEntry));
  return valid.length === 0 ? { ok: !1, message: wgULS(`${CONFIG_PAGE} 的模板列表为空或格式不正确`, `${CONFIG_PAGE} 的模板列表為空或格式不正確`) } : { ok: !0, config: { templates: valid } };
}, parseCustomTemplates = () => {
  let raw = window.UserMessages?.templates;
  return Array.isArray(raw) ? compact(raw.map(toTemplateEntry)) : [];
}, getSignatureSuffix = () => {
  let configured = window.UserMessages?.signatureSuffix;
  return typeof configured == "string" ? configured : DEFAULT_SIGNATURE_SUFFIX;
}, mergeTemplates = (preset, custom) => {
  let customTitles = new Set(custom.map((entry) => entry.title));
  return [...preset.filter((entry) => !customTitles.has(entry.title)), ...custom];
}, prefetchConfig = () => (prefetch ?? (prefetch = (async () => {
  let preset;
  try {
    preset = parseConfig(await fetchPageContent(CONFIG_PAGE));
  } catch (error) {
    preset = { ok: !1, message: toErrorMessage(error) };
  }
  let custom = parseCustomTemplates();
  return preset.ok ? settled = { ok: !0, config: { templates: mergeTemplates(preset.config.templates, custom) } } : custom.length > 0 ? settled = { ok: !0, config: { templates: custom } } : settled = preset, settled;
})()), prefetch), getSettledConfig = () => settled, findTemplate = (config, title) => config.templates.find((entry) => entry.title === title);

// packages/UserMessages/src/fields.ts
var createParamWidget = (param, $overlay) => {
  let value = param.default ?? "";
  switch (param.type ?? "text") {
    case "page":
      return new mw.widgets.TitleInputWidget({ value, suggestions: !0, $overlay });
    case "user":
      return new mw.widgets.UserInputWidget({ value, $overlay });
    case "multiline":
      return new OO.ui.MultilineTextInputWidget({ value, rows: 4, autosize: !0, maxRows: 12 });
    default:
      return new OO.ui.TextInputWidget({ value });
  }
}, createParamField = (param, $overlay, onChange) => {
  let widget = createParamWidget(param, $overlay);
  return widget.on("change", onChange), {
    param,
    widget,
    layout: new OO.ui.FieldLayout(widget, { label: param.label, align: "top" }),
    flagged: !1
  };
}, readValues = (fields) => Object.fromEntries(fields.map(({ param, widget }) => [param.key, widget.getValue()])), validateFields = (fields) => {
  let firstInvalid = null;
  for (let field of fields) {
    let invalid = (field.param.required ?? !1) && field.widget.getValue().trim() === "";
    invalid !== field.flagged && (field.flagged = invalid, field.widget.setValidityFlag(!invalid), field.layout.setErrors(invalid ? [wgULS(`${field.param.label}不能为空`, `${field.param.label}不能為空`)] : [])), invalid && !firstInvalid && (firstInvalid = field);
  }
  return firstInvalid;
};

// packages/UserMessages/src/storage.ts
var DEFAULT_STATE = { templateTitle: "", editSummary: "" }, loadPersisted = () => {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return { ...DEFAULT_STATE };
    let parsed = JSON.parse(raw);
    return {
      templateTitle: typeof parsed.templateTitle == "string" ? parsed.templateTitle : "",
      editSummary: typeof parsed.editSummary == "string" ? parsed.editSummary : ""
    };
  } catch (error) {
    return console.warn("[UserMessages] 读取本地状态失败，使用默认值", error), { ...DEFAULT_STATE };
  }
}, savePersisted = (patch) => {
  try {
    let current = loadPersisted(), next = { ...current, ...patch };
    if (next.templateTitle === current.templateTitle && next.editSummary === current.editSummary)
      return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("[UserMessages] 写入本地状态失败", error);
  }
};

// packages/UserMessages/src/wikitext.ts
var buildPresetWikitext = (tpl, values) => {
  let params = (tpl.parameters ?? []).map(({ key }) => {
    let value = values[key];
    return value ? `|${key}=${value}` : "";
  }).join("");
  return `{{${tpl.template}${params}}}`;
}, toSubst = (wikitext) => wikitext.replace(/^\{\{/, "{{subst:"), stripNoInclude = (source) => source.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, "").replace(/<\/?includeonly>/gi, "").trim(), buildSubmitText = (wikitext, customMode, signatureSuffix) => `${customMode ? wikitext : toSubst(wikitext)}${signatureSuffix}`;

// packages/UserMessages/src/openWindow.ts
var openWindow = (dialog, data, onClosed) => {
  let manager = new OO.ui.WindowManager();
  $(document.body).append(manager.$element), manager.addWindows([dialog]), manager.openWindow(dialog, data).closed.then((result) => {
    manager.$element.remove(), manager.destroy(), onClosed?.(result);
  }).catch((error) => {
    console.error("[UserMessages] 关闭回调异常", error);
  });
};

// packages/UserMessages/src/messageDialog.ts
var showMessage = (spec, actions) => new Promise((resolve) => {
  let data = { title: spec.title, message: spec.message, actions };
  openWindow(new OO.ui.MessageDialog(), data, (result) => {
    resolve(result?.action ?? "close");
  });
}), showError = async (title, message) => {
  try {
    await showMessage({ title, message }, [{ action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] }]);
  } catch (error) {
    console.error("[UserMessages] 错误提示无法显示", error);
  }
}, confirmRetry = async (title, message) => await showMessage({ title, message }, [
  { action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] },
  { action: "retry", label: wgULS("重试", "重試"), flags: ["primary", "progressive"] }
]) === "retry" ? "retry" : "close";

// packages/UserMessages/src/mainDialog.ts
var MainDialog = class extends OO.ui.ProcessDialog {
  constructor() {
    super(...arguments);
    __publicField(this, "targetUser", "");
    __publicField(this, "onPreview");
    __publicField(this, "selected", null);
    __publicField(this, "paramFields", []);
    __publicField(this, "customMode", !1);
    __publicField(this, "loadingCustom", !1);
    __publicField(this, "loadingPanel");
    __publicField(this, "formPanel");
    __publicField(this, "templateDropdown");
    __publicField(this, "customCheckbox");
    __publicField(this, "customStatus");
    __publicField(this, "paramFieldset");
    __publicField(this, "customPanel");
    __publicField(this, "customInput");
    __publicField(this, "summaryInput");
  }
  /**
   * 搭出「加载中」与「表单」两个容器，不碰配置（此时模板列表还未知）。
   * @returns 本实例
   */
  initialize() {
    return super.initialize(), this.loadingPanel = new OO.ui.PanelLayout({ padded: !0, expanded: !1 }), this.loadingPanel.$element.append(
      new OO.ui.ProgressBarWidget({ progress: !1 }).$element,
      $("<p>").text(wgULS("正在加载模板列表…", "正在載入模板列表…"))
    ), this.formPanel = new OO.ui.PanelLayout({ padded: !0, expanded: !1, scrollable: !0 }), this.$body.append(this.loadingPanel.$element, this.formPanel.$element), this;
  }
  /**
   * 等配置预取落定后把加载态换成表单。
   * 放在 setup 阶段是为了让随后的 updateSize() 按真实表单测量高度。
   * @param data 打开数据
   * @returns 设置流程
   */
  getSetupProcess(data) {
    return super.getSetupProcess(data).next(
      (async () => {
        let { targetUser, configPromise, onPreview } = data;
        this.targetUser = targetUser, this.onPreview = onPreview, this.getActions().setAbilities({ preview: !1 });
        let result = await configPromise.catch((error) => ({ ok: !1, message: toErrorMessage(error) }));
        if (!result.ok) {
          this.close({ action: "configError", message: result.message });
          return;
        }
        try {
          this.buildForm(result.config);
        } catch (error) {
          this.close({ action: "formError", message: toErrorMessage(error) });
          return;
        }
        this.loadingPanel.$element.detach();
      }),
      this
    );
  }
  /**
   * 处理底部动作：仅拦截 preview，其余交给父类。
   * 不手动 pushPending：OOUI 的 executeAction 已在整个流程（含其中的 await）外挂了一层 pending。
   * @param action 动作名
   * @returns 动作流程
   */
  getActionProcess(action) {
    return action !== "preview" ? super.getActionProcess(action) : new OO.ui.Process(
      (async () => {
        let submission = this.collectSubmission();
        if (!submission)
          return;
        let previewHtml;
        try {
          previewHtml = await parseWikitext(
            submission.submittedText,
            talkPageTitle(submission.targetUser)
          );
        } catch (error) {
          showError(wgULS("预览失败", "預覽失敗"), wgULS(`无法渲染预览：${toErrorMessage(error)}`, `無法產生預覽：${toErrorMessage(error)}`));
          return;
        }
        let data = {
          title: wgULS(`预览：${submission.templateTitle}`, `預覽：${submission.templateTitle}`),
          targetUser: submission.targetUser,
          previewHtml,
          submittedText: submission.submittedText,
          editSummary: submission.editSummary
        };
        this.onPreview?.(data);
      }),
      this
    );
  }
  /**
   * 内容区最大高度，超出则滚动。
   * @returns 高度（px）
   */
  getBodyHeight() {
    return Math.min(super.getBodyHeight(), 520);
  }
  /**
   * 构建表单。仅在配置就绪后调用一次。
   * @param config 已校验的模板配置
   */
  buildForm(config) {
    let persisted = loadPersisted(), find = (title) => findTemplate(config, title), fieldset = new OO.ui.FieldsetLayout({ label: wgULS("发送提醒", "傳送提醒") });
    this.templateDropdown = new OO.ui.DropdownWidget({
      // 未选中时显示的占位文案
      label: wgULS("请选择模板", "請選擇模板"),
      // 菜单渲染进窗口 overlay，否则会被窗口 body 的滚动容器裁剪
      $overlay: this.$overlay,
      menu: {
        items: config.templates.map(
          (entry) => new OO.ui.MenuOptionWidget({ data: entry.title, label: entry.title })
        )
      }
    }), this.templateDropdown.getMenu().on("select", (items) => {
      let item = Array.isArray(items) ? items[0] : items;
      if (!item)
        return;
      let template = find(String(item.getData()));
      template && this.applyTemplate(template);
    }), fieldset.addItems([new OO.ui.FieldLayout(this.templateDropdown, { label: wgULS("选择模板", "選擇模板"), align: "top" })]), fieldset.addItems([
      new OO.ui.FieldLayout(new OO.ui.LabelWidget({ label: this.targetUser }), {
        label: wgULS("目标用户", "目標使用者"),
        align: "top"
      })
    ]), this.customCheckbox = new OO.ui.CheckboxInputWidget({ selected: !1 }), this.customCheckbox.on("change", () => {
      if (this.customCheckbox.isSelected()) {
        this.loadCustomSource();
        return;
      }
      this.setCustomMode(!1), this.onFormChanged(), this.updateSize();
    }), this.customStatus = new OO.ui.LabelWidget({ label: "" }), fieldset.addItems([
      new OO.ui.FieldLayout(this.customCheckbox, { label: wgULS("自定义内容", "自訂內容"), align: "inline" }),
      this.customStatus
    ]), this.paramFieldset = new OO.ui.FieldsetLayout(), fieldset.addItems([this.paramFieldset]), this.customInput = new OO.ui.MultilineTextInputWidget({ rows: 8, autosize: !0, maxRows: 20 }), this.customInput.on("change", () => {
      this.onFormChanged();
    }), this.customPanel = new OO.ui.PanelLayout({ padded: !1, expanded: !1 }), this.customPanel.$element.append(
      new OO.ui.FieldLayout(this.customInput, { label: wgULS("自定义内容", "自訂內容"), align: "top" }).$element
    ), this.customPanel.toggle(!1), fieldset.addItems([this.customPanel]), this.summaryInput = new OO.ui.TextInputWidget({ value: persisted.editSummary }), this.summaryInput.on("change", () => {
      savePersisted({ editSummary: this.summaryInput.getValue() });
    }), fieldset.addItems([new OO.ui.FieldLayout(this.summaryInput, { label: wgULS("编辑摘要", "編輯摘要"), align: "top" })]), this.formPanel.$element.append(fieldset.$element);
    let restored = persisted.templateTitle ? find(persisted.templateTitle) : void 0;
    restored ? (this.templateDropdown.getMenu().selectItemByData(restored.title), this.applyTemplate(restored), persisted.editSummary !== "" && this.summaryInput.setValue(persisted.editSummary)) : this.onFormChanged();
  }
  /**
   * 在「预置参数」与「自定义内容」两套界面之间切换。
   * @param enabled 是否切到自定义内容
   */
  setCustomMode(enabled) {
    this.customMode = enabled, this.customCheckbox.setSelected(enabled), this.customPanel.toggle(enabled), this.paramFieldset.toggle(!enabled);
  }
  /**
   * 切换到某个模板：重置自定义模式、重建参数区、重新填入摘要。
   * @param template 选中的模板
   */
  applyTemplate(template) {
    this.selected = template, this.setCustomMode(!1), this.customInput.setValue(""), this.paramFields = (template.parameters ?? []).map(
      (param) => createParamField(param, this.$overlay, () => {
        this.onFormChanged();
      })
    ), this.paramFieldset.clearItems(), this.paramFieldset.addItems(this.paramFields.map(({ layout }) => layout)), this.summaryInput.setValue(template.summary), savePersisted({ templateTitle: template.title, editSummary: template.summary }), this.onFormChanged(), this.updateSize();
  }
  /** 按当前模式重算「预览」按钮的可用性，并刷新字段级校验提示。 */
  onFormChanged() {
    if (this.customMode) {
      this.getActions().setAbilities({ preview: this.customInput.getValue().trim() !== "" });
      return;
    }
    let firstInvalid = validateFields(this.paramFields);
    this.getActions().setAbilities({ preview: this.selected !== null && firstInvalid === null });
  }
  /**
   * 勾选自定义内容后拉取所选中模板的源码。
   * 失败则回退到预置模式（取消勾选并恢复参数表单）。
   * @returns 完成时兑现
   */
  async loadCustomSource() {
    let template = this.selected;
    if (!(!template || this.loadingCustom)) {
      this.loadingCustom = !0, this.customCheckbox.setDisabled(!0), this.customStatus.setLabel(wgULS(`正在加载 ${template.template}…`, `正在載入 ${template.template}…`));
      try {
        let source = await fetchPageContentOrThrow(template.template);
        if (template !== this.selected)
          return;
        this.customInput.setValue(stripNoInclude(source)), this.setCustomMode(!0);
      } catch (error) {
        if (template !== this.selected)
          return;
        this.setCustomMode(!1), showError(wgULS("加载失败", "載入失敗"), wgULS(`无法加载 ${template.template} 的源代码：${toErrorMessage(error)}`, `無法載入 ${template.template} 的原始碼：${toErrorMessage(error)}`));
      } finally {
        this.loadingCustom = !1, this.customCheckbox.setDisabled(!1), this.customStatus.setLabel(""), this.onFormChanged(), this.updateSize();
      }
    }
  }
  /**
   * 汇总当前表单，产出待预览/提交的内容。校验不过时返回 null 并给出提示。
   * @returns 待预览/提交的内容
   */
  collectSubmission() {
    if (!this.selected)
      return showError(wgULS("未选择模板", "未選擇模板"), wgULS("请先选择一个提醒模板。", "請先選擇一個提醒模板。")), null;
    if (!this.customMode) {
      let firstInvalid = validateFields(this.paramFields);
      if (firstInvalid)
        return firstInvalid.widget.focus(), null;
    }
    let raw = this.customMode ? this.customInput.getValue().trim() : buildPresetWikitext(this.selected, readValues(this.paramFields));
    return raw === "" ? (showError(wgULS("内容为空", "內容為空"), wgULS("待发送的内容不能为空。", "待傳送的內容不能為空。")), null) : {
      targetUser: this.targetUser,
      submittedText: buildSubmitText(raw, this.customMode, getSignatureSuffix()),
      editSummary: this.summaryInput.getValue(),
      templateTitle: this.selected.title
    };
  }
};
/**
 * 必须逐项写全：OO.inheritClass 用 Object.create 继承静态成员，
 * { ...OO.ui.ProcessDialog.static } 展开结果是空对象。
 */
__publicField(MainDialog, "static", {
  ...OO.ui.ProcessDialog.static,
  name: "usermessages-main",
  title: wgULS("向用户发送提醒", "向使用者傳送提醒"),
  size: DIALOG_SIZE,
  tagName: "div",
  escapable: !0,
  actions: [
    { action: "preview", label: wgULS("预览", "預覽"), flags: ["primary", "progressive"] },
    // 没有 action 名：OO.ui.Dialog 会自动关闭对话框
    { label: "取消", flags: ["safe"] }
  ]
});

// packages/UserMessages/src/send.ts
var sendEdit = (params) => api.postWithToken("csrf", {
  action: "edit",
  assertuser: mw.config.get("wgUserName") ?? "",
  formatversion: 2,
  title: talkPageTitle(params.targetUser),
  section: "new",
  sectiontitle: "",
  text: params.text,
  summary: params.summary,
  tags: "Automation tool|UserMessages"
}).then((res) => ({ ok: !0, newrevid: res?.edit?.newrevid })).catch((code, result) => (console.warn("[UserMessages] 发送失败", code, result), { ok: !1, code, detail: describeSendError(code, result) })), fetchLastSectionAnchor = async (revid) => {
  if (!revid)
    return "";
  try {
    return ((await api.post({
      action: "parse",
      oldid: revid,
      prop: "sections",
      formatversion: 2
    })).parse?.sections ?? []).at(-1)?.anchor ?? "";
  } catch (error) {
    return console.warn("[UserMessages] 读取新章节锚点失败", error), "";
  }
}, newSectionUrl = (user, anchor) => {
  let url = mw.util.getUrl(talkPageTitle(user));
  return anchor === "" ? url : `${url}#${encodeURIComponent(anchor)}`;
}, gotoNewSection = (user, anchor) => {
  let url = newSectionUrl(user, anchor);
  if (mw.config.get("wgPageName") === talkPageTitle(user).replace(/ /g, "_")) {
    location.hash = new URL(url, location.href).hash, location.reload();
    return;
  }
  location.assign(url);
};

// packages/UserMessages/src/previewDialog.ts
var PreviewDialog = class extends OO.ui.ProcessDialog {
  constructor() {
    super(...arguments);
    __publicField(this, "sendParams", null);
    __publicField(this, "sending", !1);
    __publicField(this, "htmlPanel");
    __publicField(this, "contentPanel");
    __publicField(this, "wikitextToggle");
    __publicField(this, "wikitextInput");
    __publicField(this, "wikitextLayout");
  }
  /**
   * 搭出预览区与可折叠的 wikitext 区。
   * @returns 本实例
   */
  initialize() {
    return super.initialize(), this.htmlPanel = new OO.ui.PanelLayout({ padded: !0, expanded: !1 }), this.wikitextInput = new OO.ui.MultilineTextInputWidget({
      value: "",
      readOnly: !0,
      rows: 8,
      autosize: !0,
      maxRows: 16
    }), this.wikitextLayout = new OO.ui.FieldLayout(this.wikitextInput, {
      label: "待提交的 wikitext",
      align: "top"
    }), this.wikitextToggle = new OO.ui.ToggleButtonWidget({ label: wgULS("显示待提交的 wikitext", "顯示待提交的 wikitext"), value: !1 }), this.wikitextToggle.on("change", () => {
      let expanded = this.wikitextToggle.getValue();
      this.wikitextToggle.setLabel(expanded ? wgULS("隐藏待提交的 wikitext", "隱藏待提交的 wikitext") : wgULS("显示待提交的 wikitext", "顯示待提交的 wikitext")), this.wikitextLayout.toggle(expanded), this.updateSize();
    }), this.contentPanel = new OO.ui.PanelLayout({ padded: !1, expanded: !1, scrollable: !0 }), this.contentPanel.$element.append(
      this.htmlPanel.$element,
      this.wikitextToggle.$element,
      this.wikitextLayout.$element
    ), this.$body.append(this.contentPanel.$element), this;
  }
  /**
   * 从打开数据里取出渲染结果与待提交正文。
   * @param data 打开数据
   * @returns 设置流程
   */
  getSetupProcess(data) {
    return super.getSetupProcess(data).next(() => {
      let payload = data;
      this.htmlPanel.$element.html(payload.previewHtml), this.wikitextInput.setValue(payload.submittedText), this.wikitextToggle.setValue(!1), this.wikitextLayout.toggle(!1), this.sendParams = {
        targetUser: payload.targetUser,
        text: payload.submittedText,
        summary: payload.editSummary
      };
    }, this);
  }
  /**
   * 内容已插入可见 DOM 后再触发 wikipage.content，
   * 让 <gallery>、折叠元素等依赖 JS 初始化的内容在预览里也能正常工作。
   * @param data 打开数据
   * @returns 就绪流程
   */
  getReadyProcess(data) {
    return super.getReadyProcess(data).next(() => {
      mw.hook("wikipage.content").fire(this.htmlPanel.$element);
    }, this);
  }
  /**
   * 处理底部动作：拦截 back 与 send，其余交给父类。
   * @param action 动作名
   * @returns 动作流程
   */
  getActionProcess(action) {
    return action === "back" ? new OO.ui.Process(() => {
      this.close({ action: "back" });
    }, this) : action !== "send" ? super.getActionProcess(action) : new OO.ui.Process(
      (async () => {
        let params = this.sendParams;
        if (!(this.sending || !params)) {
          this.setSending(!0);
          try {
            for (; ; ) {
              let result = await sendEdit(params);
              if (result.ok) {
                let anchor = await fetchLastSectionAnchor(result.newrevid);
                this.close({ action: "sent", anchor });
                return;
              }
              if (await confirmRetry(wgULS("发送失败", "傳送失敗"), result.detail) !== "retry") {
                this.setSending(!1);
                return;
              }
            }
          } catch (error) {
            this.setSending(!1), showError(wgULS("发送失败", "傳送失敗"), toErrorMessage(error));
          }
        }
      }),
      this
    );
  }
  /**
   * 内容区最大高度，超出则滚动。
   * @returns 高度（px）
   */
  getBodyHeight() {
    return Math.min(super.getBodyHeight(), 560);
  }
  /**
   * 发送中禁用两个按钮并改文案，防止重复投递。
   * @param sending 是否正在发送
   */
  setSending(sending) {
    this.sending = sending, this.getActions().setAbilities({ send: !sending, back: !sending }), this.getActions().get({ actions: "send" }).at(0)?.setLabel(sending ? wgULS("发送中…", "傳送中…") : wgULS("发送提醒", "傳送提醒"));
  }
};
/** 见 MainDialog 中关于 static 必须写全的说明。 */
__publicField(PreviewDialog, "static", {
  ...OO.ui.ProcessDialog.static,
  name: "usermessages-preview",
  title: wgULS("预览", "預覽"),
  size: DIALOG_SIZE,
  tagName: "div",
  escapable: !0,
  actions: [
    { action: "send", label: wgULS("发送提醒", "傳送提醒"), flags: ["primary", "progressive"] },
    { action: "back", label: "返回", flags: ["safe"] }
  ]
});

// packages/UserMessages/src/index.ts
(() => {
  let { wgNamespaceNumber, wgCanonicalSpecialPageName, wgRelevantUserName } = mw.config.get();
  if (!ALLOWED_NAMESPACES.includes(wgNamespaceNumber) || wgNamespaceNumber === -1 && !ALLOWED_SPECIAL_PAGES.includes(wgCanonicalSpecialPageName || "") || !wgRelevantUserName)
    return;
  let configPromise = prefetchConfig(), describeConfigFailure = (reason) => wgULS(`${CONFIG_PAGE} 读取或解析失败：${reason}`, `${CONFIG_PAGE} 讀取或解析失敗：${reason}`), openPreview = (data, mainDialog) => {
    openWindow(new PreviewDialog({ size: DIALOG_SIZE }), data, (result) => {
      result?.action === "sent" && (mainDialog.close(), mw.notify(wgULS("发送成功，3 秒后跳转", "傳送成功，3 秒後跳轉"), { type: "success" }), window.setTimeout(() => {
        gotoNewSection(data.targetUser, result.anchor ?? "");
      }, 3e3));
    });
  }, openDialog = () => {
    let settledConfig = getSettledConfig();
    if (settledConfig && !settledConfig.ok) {
      showError(wgULS("无法加载模板列表", "無法載入模板列表"), describeConfigFailure(settledConfig.message));
      return;
    }
    let mainDialog = new MainDialog({ size: DIALOG_SIZE });
    openWindow(mainDialog, {
      targetUser: wgRelevantUserName,
      configPromise,
      onPreview: (previewData) => {
        openPreview(previewData, mainDialog);
      }
    }, (result) => {
      if (result?.action === "configError") {
        showError(wgULS("无法加载模板列表", "無法載入模板列表"), describeConfigFailure(result.message));
        return;
      }
      result?.action === "formError" && showError(wgULS("界面构建失败", "介面建構失敗"), wgULS(`无法生成表单：${result.message}`, `無法產生表單：${result.message}`));
    });
  };
  mw.util.addPortletLink(
    "p-cactions",
    "#",
    wgULS("向用户发送提醒", "向使用者傳送提醒"),
    "p-usermessages",
    wgULS("向该用户发送提醒模板", "向該使用者傳送提醒模板")
  )?.querySelector("a")?.addEventListener("click", (event) => {
    event.preventDefault(), openDialog();
  });
})();
