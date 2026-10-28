/**
 * 本文件由 packages/QuickRequest 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value);

// packages/QuickRequest/src/constants.ts
var CONFIG_PAGE = "MediaWiki:Gadget-QuickRequest.json", DIALOG_SIZE = "large";
var CHANGE_TAG = "Automation tool|QuickRequest", OPERATIONS_BOARD = "萌娘百科_talk:讨论版/操作申请", RIGHTS_BOARD = "萌娘百科_talk:讨论版/权限变更", CONVERSION_TABLE_PATTERN = /^MediaWiki:Conversiontable\/zh-[a-z]+$/, POLICY_CATEGORIES = ["萌娘百科方针", "萌娘百科指引"], WARNING_SKIP_GROUPS = ["patroller", "sysop", "techeditor", "interface-admin", "staff"], titleSuffix = (userName, now) => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;

// packages/QuickRequest/src/errors.ts
var toErrorMessage = (error) => error instanceof Error ? error.message : String(error), ERROR_MESSAGES = {
  badtoken: wgULS("登录令牌已失效，请刷新页面后重试。", "登入權杖已失效，請重新整理頁面後再試。"),
  assertnameduserfailed: wgULS("当前登录状态已失效（可能已在别处退出登录），请刷新页面后重新登录。", "目前登入狀態已失效（可能已在別處登出），請重新整理頁面後重新登入。"),
  ratelimited: wgULS("操作过于频繁，已被限流，请稍后再试。", "操作過於頻繁，已受到頻率限制，請稍後再試。"),
  permissiondenied: wgULS("权限不足，无法编辑该页面。", "權限不足，無法編輯該頁面。"),
  blocked: wgULS("您当前的账号或 IP 已被封禁，无法编辑。", "您目前的帳號或 IP 已被封鎖，無法編輯。"),
  spamdetected: wgULS("内容被滥用过滤器判定为垃圾信息，已被拒绝。", "內容被防濫用過濾器判定為垃圾資訊，已被拒絕。"),
  articleexists: wgULS("目标页面已存在，无法新建。", "目標頁面已存在，無法建立。"),
  readonly: wgULS("本站当前处于只读状态，暂时无法编辑。", "本站目前處於唯讀狀態，暫時無法編輯。")
}, extractInfo = (result) => typeof result != "object" || result === null ? "" : result.error?.info ?? result.errors?.[0]?.info ?? "", describeSendError = (code, result) => {
  let info = extractInfo(result), known = Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : void 0;
  return known ? info ? `${known}（${info}）` : known : code.startsWith("abusefilter") ? wgULS(`被滥用过滤器阻止（${code}）${info ? `：${info}` : ""}`, `被防濫用過濾器阻止（${code}）${info ? `：${info}` : ""}`) : wgULS(`发送失败（${code}）${info ? `：${info}` : ""}`, `傳送失敗（${code}）${info ? `：${info}` : ""}`);
};

// packages/QuickRequest/src/api.ts
var apiInstance = null, getApi = () => (apiInstance ?? (apiInstance = new mw.Api({ ajax: { timeout: 3e4 } })), apiInstance), fetchPageContent = async (title) => (await getApi().post({
  action: "query",
  titles: title,
  prop: "revisions",
  rvprop: "content",
  formatversion: 2
})).query?.pages?.[0]?.revisions?.[0]?.content ?? "", parseWikitext = async (wikitext, title) => (await getApi().post({
  action: "parse",
  title,
  text: wikitext,
  contentmodel: "wikitext",
  pst: !0,
  disablelimitreport: !0,
  formatversion: 2,
  wrapoutputclass: "mw-parser-output"
})).parse?.text ?? "";

// packages/QuickRequest/src/config.ts
var PARAM_TYPES = /* @__PURE__ */ new Set(["page", "user", "text", "multiline"]), isParamType = (value) => typeof value == "string" && PARAM_TYPES.has(value), compact = (items) => items.filter((item) => item !== null), prefetch = null, isNonEmptyString = (value) => typeof value == "string" && value.trim() !== "", toRequestParam = (raw) => {
  if (typeof raw != "object" || raw === null)
    return null;
  let { key, label, type, required, auto, readOnly, hint, default: defaultValue } = raw;
  if (!isNonEmptyString(key) || !isNonEmptyString(label))
    return null;
  let param = { key, label };
  return isParamType(type) && (param.type = type), typeof required == "boolean" && (param.required = required), auto === "currentPage" && (param.auto = auto), typeof readOnly == "boolean" && (param.readOnly = readOnly), isNonEmptyString(hint) && (param.hint = hint), typeof defaultValue == "string" && (param.default = defaultValue), param;
}, toFixedParams = (raw) => {
  if (typeof raw != "object" || raw === null)
    return;
  let fixed = {};
  for (let [key, value] of Object.entries(raw))
    typeof value == "string" && (fixed[key] = value);
  return Object.keys(fixed).length > 0 ? fixed : void 0;
}, toTypeVariant = (raw) => {
  if (typeof raw != "object" || raw === null)
    return null;
  let { id, label, template, parameters, requireAnyOf, fixedParams } = raw;
  if (!isNonEmptyString(id) || !isNonEmptyString(label) || !isNonEmptyString(template))
    return null;
  let variant = { id, label, template };
  if (Array.isArray(parameters) && (variant.parameters = compact(parameters.map(toRequestParam))), Array.isArray(requireAnyOf)) {
    let keys = new Set((variant.parameters ?? []).map(({ key }) => key)), valid = requireAnyOf.filter((key) => typeof key == "string" && keys.has(key));
    valid.length > 0 && (variant.requireAnyOf = valid);
  }
  let fixed = toFixedParams(fixedParams);
  return fixed !== void 0 && (variant.fixedParams = fixed), variant;
}, toTypeConfig = (raw) => {
  if (typeof raw != "object" || raw === null)
    return null;
  let { template, parameters, requireAnyOf, variants, fixedParams } = raw, config = {};
  isNonEmptyString(template) && (config.template = template);
  let fixed = toFixedParams(fixedParams);
  if (fixed !== void 0 && (config.fixedParams = fixed), Array.isArray(parameters) && (config.parameters = compact(parameters.map(toRequestParam))), Array.isArray(requireAnyOf)) {
    let keys = new Set((config.parameters ?? []).map(({ key }) => key)), valid = requireAnyOf.filter((key) => typeof key == "string" && keys.has(key));
    valid.length > 0 && (config.requireAnyOf = valid);
  }
  if (Array.isArray(variants)) {
    let seen = /* @__PURE__ */ new Set(), validVariants = [];
    for (let entry of variants) {
      let variant = toTypeVariant(entry);
      variant && !seen.has(variant.id) && (seen.add(variant.id), validVariants.push(variant));
    }
    validVariants.length > 0 && (config.variants = validVariants);
  }
  return config.template === void 0 && config.variants === void 0 ? null : config;
}, parseConfig = (raw) => {
  if (raw.trim() === "")
    return { ok: !1, message: wgULS(`页面 ${CONFIG_PAGE} 不存在或内容为空`, `頁面 ${CONFIG_PAGE} 不存在或內容為空`) };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: !1, message: wgULS(`JSON 解析失败：${toErrorMessage(error)}`, `JSON 解析失敗：${toErrorMessage(error)}`) };
  }
  let types = parsed?.types;
  if (typeof types != "object" || types === null)
    return { ok: !1, message: wgULS(`${CONFIG_PAGE} 缺少 types 对象`, `${CONFIG_PAGE} 缺少 types 物件`) };
  let merged = {}, validCount = 0;
  for (let [id, entry] of Object.entries(types)) {
    let config = toTypeConfig(entry);
    config && (merged[id] = config, validCount += 1);
  }
  return validCount === 0 ? { ok: !1, message: wgULS(`${CONFIG_PAGE} 的类型列表为空或格式不正确`, `${CONFIG_PAGE} 的類型列表為空或格式不正確`) } : { ok: !0, config: { types: merged } };
}, prefetchConfig = () => (prefetch ?? (prefetch = (async () => {
  let result;
  try {
    result = parseConfig(await fetchPageContent(CONFIG_PAGE));
  } catch (error) {
    result = { ok: !1, message: toErrorMessage(error) };
  }
  return result.ok || (prefetch = null), result;
})()), prefetch), isGroupSatisfied = (typeConfig, values) => {
  let keys = typeConfig.requireAnyOf;
  return keys === void 0 || keys.length === 0 ? !0 : keys.some((key) => (values[key] ?? "").trim() !== "");
}, findTypeConfig = (config, id) => config.types[id];

// packages/QuickRequest/src/blockInfo.ts
var formatBlockInfo = (user) => {
  if (user.blockid === void 0 || user.blockedby === void 0)
    return null;
  let reason = user.blockreason?.replaceAll(`
`, "") ?? "", text = `该用户已被封禁，执行封禁的人员是[[U:${user.blockedby}|${user.blockedby}]]。封禁原因是：''${reason === "" ? "未给出原因" : reason}''。
`;
  return text += `* 封禁开始时间：${user.blockedtimestampformatted ?? ""}
`, text += `* 封禁期满时间：${user.blockexpiry === "infinite" ? "无限期" : user.blockexpiryformatted ?? ""}
`, text += `* 封禁编号：#${user.blockid}`, text;
}, fetchBlockInfoText = async () => {
  let userName = mw.config.get("wgUserName") ?? "", res = await getApi().post({
    action: "query",
    list: "users",
    usprop: "blockinfo",
    ususers: userName,
    formatversion: 2
  });
  return formatBlockInfo(res.query?.users?.[0] ?? {});
};

// packages/QuickRequest/src/registry.ts
var policyWarning = (ctx) => {
  if (ctx.userGroups.some((group) => WARNING_SKIP_GROUPS.includes(group)))
    return Promise.resolve([]);
  let categories = mw.config.get("wgCategories");
  if (!POLICY_CATEGORIES.some((category) => categories.includes(category)))
    return Promise.resolve([]);
  let message = $("<div>").append(
    $("<p>").append(
      wgULS("进行", "進行"),
      $("<strong>").text(wgULS("实质性", "實質性")),
      wgULS("修改时，需要通过", "修改時，需要通過"),
      $("<a>", {
        href: "/萌娘百科:提案",
        text: wgULS("提案", "提案")
      }).css("font-weight", "bold"),
      wgULS("或", "或"),
      $("<a>", {
        href: "/萌娘百科:快速提案",
        text: wgULS("快速提案", "快速提案")
      }).css("font-weight", "bold"),
      wgULS("流程才可对方针和指引进行改动。", "流程才可對方針和指引進行改動。")
    ),
    $("<p>").append(
      wgULS("在讨论页发起的编辑请求仅可用于修正错别字等", "在討論頁發起的編輯請求僅可用於修正錯別字等"),
      $("<strong>").text(wgULS("非实质性", "非實質性")),
      wgULS("修改。", "修改。")
    )
  );
  return Promise.resolve([{ title: wgULS("提醒", "提醒"), message }]);
}, editDefinition = {
  id: "edit",
  label: wgULS("编辑请求", "編輯請求"),
  availability: () => !0,
  resolveTarget: (ctx) => ctx.talkPage,
  sectionTitle: (ctx) => `编辑请求${titleSuffix(ctx.userName, ctx.now)}`,
  warnings: policyWarning
}, editConversiontableDefinition = {
  ...editDefinition,
  id: "editConversiontable",
  label: wgULS("编辑请求（转换表）", "編輯請求（轉換表）")
}, moveDefinition = {
  id: "move",
  label: wgULS("移动请求", "移動請求"),
  availability: () => !0,
  resolveTarget: () => OPERATIONS_BOARD,
  sectionTitle: (ctx) => `移动请求${titleSuffix(ctx.userName, ctx.now)}`
}, createDefinition = {
  id: "create",
  label: wgULS("创建请求", "建立請求"),
  availability: () => !0,
  resolveTarget: () => OPERATIONS_BOARD,
  sectionTitle: (ctx) => `创建请求${titleSuffix(ctx.userName, ctx.now)}`
}, userGroupDefinition = {
  id: "userGroup",
  label: wgULS("权限申请", "權限申請"),
  // 与现行申请按钮（Widget:Applybutton）的守卫一致：仅自动确认用户可用
  availability: (ctx) => ctx.userGroups.includes("autoconfirmed"),
  resolveTarget: () => RIGHTS_BOARD,
  postMode: "append"
}, banAppealDefinition = {
  id: "banAppeal",
  label: wgULS("封禁申诉", "封鎖申訴"),
  availability: () => !0,
  resolveTarget: (ctx) => `User_talk:${ctx.userName}`,
  postMode: "append",
  allowCreate: !0
}, REQUEST_TYPES = {
  edit: editDefinition,
  editConversiontable: editConversiontableDefinition,
  move: moveDefinition,
  create: createDefinition,
  userGroup: userGroupDefinition,
  banAppeal: banAppealDefinition
}, resolveRequestType = (id, pageName) => id === "edit" && CONVERSION_TABLE_PATTERN.test(pageName) ? REQUEST_TYPES.editConversiontable : REQUEST_TYPES[id], buildContext = (userName) => ({
  pageName: mw.config.get("wgPageName"),
  talkPage: libGetPageNames().talkPage,
  userName,
  userGroups: mw.config.get("wgUserGroups") ?? [],
  now: /* @__PURE__ */ new Date()
});

// packages/QuickRequest/src/entries.ts
var mountUserGroupEntry = () => {
  if (mw.config.get("wgPageName") !== RIGHTS_BOARD || !REQUEST_TYPES.userGroup?.availability(buildContext(mw.config.get("wgUserName") ?? "")))
    return;
  let link = mw.util.addPortletLink("p-cactions", "#", wgULS("发起权限申请", "發起權限申請"), "ca-quickrequest-usergroup");
  link && $(link).on("click", (event) => {
    event.preventDefault(), window.libQuickRequest?.open("userGroup");
  });
}, mountBanAppealEntry = () => {
  let $container = $("#BlockedUserHelp");
  if ($container.length === 0)
    return;
  let openBanAppeal = async () => {
    try {
      let blockInfo = await fetchBlockInfoText();
      if (blockInfo === null) {
        mw.notify(wgULS("您当前不在封禁中，无需申诉。", "您目前不在封鎖中，無需申訴。"));
        return;
      }
      window.libQuickRequest?.open("banAppeal", { 1: blockInfo });
    } catch (error) {
      mw.notify(wgULS(`查询封禁信息失败：${toErrorMessage(error)}`, `查詢封鎖資訊失敗：${toErrorMessage(error)}`), { type: "error" });
    }
  }, button = new OO.ui.ButtonWidget({ label: wgULS("寻求帮助", "尋求幫助"), flags: ["primary", "progressive"] });
  button.on("click", () => {
    openBanAppeal();
  }), $container.append(button.$element);
}, entryMounters = [mountUserGroupEntry, mountBanAppealEntry], mountEntries = () => {
  for (let mount of entryMounters)
    mount();
};

// packages/QuickRequest/src/fields.ts
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
  return (param.readOnly === !0 || param.auto === "currentPage") && widget.setReadOnly(!0), widget.on("change", onChange), {
    param,
    widget,
    layout: new OO.ui.FieldLayout(widget, {
      label: param.label,
      align: "top",
      ...param.hint === void 0 ? {} : { help: param.hint, helpInline: !0 }
    }),
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

// packages/QuickRequest/src/wikitext.ts
var escapeTopLevelPipes = (value) => {
  let depth = 0, out = "", index = 0;
  for (; index < value.length; ) {
    let two = value.slice(index, index + 2);
    if (two === "{{" || two === "[[") {
      depth += 1, out += two, index += 2;
      continue;
    }
    if (depth > 0 && (two === "}}" || two === "]]")) {
      depth -= 1, out += two, index += 2;
      continue;
    }
    if (value[index] === "|" && depth === 0) {
      out += "{{!}}", index += 1;
      continue;
    }
    out += value[index], index += 1;
  }
  return out;
}, buildTemplateWikitext = (spec, values) => {
  let fixed = Object.entries(spec.fixedParams ?? {}).map(([key, value]) => `|${key}=${escapeTopLevelPipes(value)}`).join(""), params = (spec.parameters ?? []).map(({ key }) => {
    let value = values[key];
    return value ? `|${key}=${escapeTopLevelPipes(value)}` : "";
  }).join("");
  return `{{${spec.template}${fixed}${params}}}`;
}, toSubst = (wikitext) => wikitext.replace(/^\{\{/, "{{subst:"), buildSubmitText = (wikitext) => toSubst(wikitext);

// packages/QuickRequest/src/openWindow.ts
var openWindow = (dialog, data, onClosed) => {
  let manager = new OO.ui.WindowManager();
  $(document.body).append(manager.$element), manager.addWindows([dialog]), manager.openWindow(dialog, data).closed.then((result) => {
    manager.$element.remove(), manager.destroy(), onClosed?.(result);
  }).catch((error) => {
    console.error("[QuickRequest] 关闭回调异常", error);
  });
};

// packages/QuickRequest/src/messageDialog.ts
var showMessage = (spec, actions) => new Promise((resolve) => {
  let data = { title: spec.title, message: spec.message, actions };
  openWindow(new OO.ui.MessageDialog(), data, (result) => {
    resolve(result?.action ?? "close");
  });
}), showError = async (title, message) => {
  try {
    await showMessage({ title, message }, [{ action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] }]);
  } catch (error) {
    console.error("[QuickRequest] 错误提示无法显示", error);
  }
}, confirmRetry = async (title, message) => await showMessage({ title, message }, [
  { action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] },
  { action: "retry", label: wgULS("重试", "重試"), flags: ["primary", "progressive"] }
]) === "retry" ? "retry" : "close", confirmContinue = async (title, message) => await showMessage({ title, message }, [
  { action: "close", label: wgULS("返回修改", "返回修改"), flags: ["safe"] },
  { action: "continue", label: wgULS("继续提交", "繼續提交"), flags: ["primary", "progressive"] }
]) === "continue" ? "continue" : "close", confirmAmbiguousRetry = async (title, message) => await showMessage({
  title,
  message: `${message}${wgULS("网络异常，请求可能已经发出：请先到目标版面确认是否已存在你的请求，再决定是否重新提交。", "網路異常，請求可能已經發出：請先到目標版面確認是否已存在你的請求，再決定是否重新提交。")}`
}, [
  { action: "close", label: wgULS("关闭", "關閉"), flags: ["safe", "primary"] },
  { action: "retry", label: wgULS("仍要重试", "仍要重試") }
]) === "retry" ? "retry" : "close";

// packages/QuickRequest/src/mainDialog.ts
var MainDialog = class extends OO.ui.ProcessDialog {
  constructor() {
    super(...arguments);
    __publicField(this, "definition");
    __publicField(this, "context");
    __publicField(this, "onPreview");
    /** 入口预填值（封禁申诉的封禁信息等）；无预填的类型为 undefined */
    __publicField(this, "preset");
    __publicField(this, "typeConfig", null);
    /** 当前生效的模板规格：无变体类型即类型条目，有变体类型为选中的变体 */
    __publicField(this, "activeSpec", null);
    __publicField(this, "variantInput", null);
    __publicField(this, "paramFields", []);
    __publicField(this, "loadingPanel");
    __publicField(this, "formPanel");
    __publicField(this, "paramFieldset");
    __publicField(this, "groupHint");
    __publicField(this, "summaryInput");
  }
  /**
   * 搭出「加载中」与「表单」两个容器，不碰配置（此时类型条目还未知）。
   * @returns 本实例
   */
  initialize() {
    return super.initialize(), this.loadingPanel = new OO.ui.PanelLayout({ padded: !0, expanded: !1 }), this.loadingPanel.$element.append(
      new OO.ui.ProgressBarWidget({ progress: !1 }).$element,
      $("<p>").text(wgULS("正在加载请求配置…", "正在載入請求組態…"))
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
        let { definition, context, configPromise, onPreview, preset } = data;
        this.definition = definition, this.context = context, this.onPreview = onPreview, this.preset = preset, this.getActions().setAbilities({ preview: !1 });
        let result = await configPromise.catch((error) => ({ ok: !1, message: toErrorMessage(error) }));
        if (!result.ok) {
          this.close({ action: "configError", message: result.message });
          return;
        }
        let typeConfig = findTypeConfig(result.config, definition.id);
        if (!typeConfig) {
          this.close({ action: "configError", message: wgULS(`${CONFIG_PAGE} 缺少 ${definition.id} 类型条目`, `${CONFIG_PAGE} 缺少 ${definition.id} 類型條目`) });
          return;
        }
        try {
          this.buildForm(typeConfig);
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
          previewHtml = await parseWikitext(submission.submittedText, submission.targetPage);
        } catch (error) {
          showError(wgULS("预览失败", "預覽失敗"), wgULS(`无法渲染预览：${toErrorMessage(error)}`, `無法產生預覽：${toErrorMessage(error)}`));
          return;
        }
        let data = {
          title: wgULS(`预览：${this.definition.label}`, `預覽：${this.definition.label}`),
          previewHtml,
          submittedText: submission.submittedText,
          targetPage: submission.targetPage,
          ...submission.getSectionTitle === void 0 ? {} : { getSectionTitle: submission.getSectionTitle },
          ...submission.postMode === void 0 ? {} : { postMode: submission.postMode },
          editSummary: submission.editSummary,
          ...this.definition.warnings === void 0 ? {} : { getWarnings: () => this.definition.warnings?.(this.context) ?? Promise.resolve([]) }
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
   * 变体类型（userGroup）额外渲染「申请类型」下拉，参数区随选中变体整体重建。
   * @param typeConfig 类型配置
   */
  buildForm(typeConfig) {
    this.typeConfig = typeConfig;
    let fieldset = new OO.ui.FieldsetLayout({ label: this.definition.label }), targetPage = this.definition.resolveTarget(this.context);
    targetPage !== !1 && fieldset.addItems([
      new OO.ui.FieldLayout(new OO.ui.LabelWidget({ label: targetPage.replace(/_/g, " ") }), {
        label: wgULS("发至", "發至"),
        align: "top"
      })
    ]);
    let variants = typeConfig.variants ?? [], initialSpec;
    if (variants.length > 0)
      this.variantInput = new OO.ui.DropdownInputWidget({
        options: variants.map(({ id, label }) => ({ data: id, label })),
        value: variants[0]?.id
      }), this.variantInput.on("change", () => {
        this.rebuildParamArea(this.currentVariant());
      }), fieldset.addItems([new OO.ui.FieldLayout(this.variantInput, { label: wgULS("申请类型", "申請類型"), align: "top" })]), initialSpec = variants[0];
    else {
      let template = typeConfig.template;
      if (!template)
        throw new Error(wgULS("类型配置既无模板也无变体", "類型組態既無模板也無變體"));
      initialSpec = {
        template,
        ...typeConfig.parameters === void 0 ? {} : { parameters: typeConfig.parameters },
        ...typeConfig.requireAnyOf === void 0 ? {} : { requireAnyOf: typeConfig.requireAnyOf },
        ...typeConfig.fixedParams === void 0 ? {} : { fixedParams: typeConfig.fixedParams }
      };
    }
    this.paramFieldset = new OO.ui.FieldsetLayout(), fieldset.addItems([this.paramFieldset]), this.groupHint = new OO.ui.LabelWidget({ label: "" }), this.groupHint.$element.css("color", "#d33"), fieldset.addItems([this.groupHint]), this.summaryInput = new OO.ui.TextInputWidget({ value: this.definition.defaultSummary ?? "", placeholder: wgULS("留空则自动生成", "留空則自動生成") }), fieldset.addItems([new OO.ui.FieldLayout(this.summaryInput, { label: wgULS("编辑摘要", "編輯摘要"), align: "top" })]), this.formPanel.$element.append(fieldset.$element), this.rebuildParamArea(initialSpec), this.definition.warnings?.(this.context).then((warnings) => {
      for (let warning of warnings)
        this.formPanel.$element.prepend(new OO.ui.MessageWidget({ type: "warning", label: warning.message }).$element);
    });
  }
  /**
   * 当前选中的变体。仅变体类型调用（variantInput 已存在）。
   * @returns 选中的变体；下拉值异常时回退首个
   */
  currentVariant() {
    let variants = this.typeConfig?.variants ?? [];
    return variants.find((variant) => variant.id === this.variantInput?.getValue()) ?? variants[0];
  }
  /**
   * 按模板规格重建参数区与组约束提示。初次构建与变体切换共用；
   * 切换变体时已填内容不保留——各变体字段结构不同，保留无意义。
   * @param spec 生效的模板规格
   */
  rebuildParamArea(spec) {
    this.activeSpec = spec, this.paramFieldset.clearItems(), this.paramFields = (spec.parameters ?? []).map((param) => {
      let presetValue = this.preset?.[param.key], autoValue = param.auto === "currentPage" ? this.context.pageName : void 0, initial = presetValue ?? autoValue ?? param.default, effective = initial === void 0 ? param : { ...param, default: initial };
      return createParamField(
        effective,
        this.$overlay,
        () => {
          this.onFormChanged();
        }
      );
    }), this.paramFieldset.addItems(this.paramFields.map(({ layout }) => layout));
    let groupLabels = (spec.requireAnyOf ?? []).map((key) => spec.parameters?.find((param) => param.key === key)?.label ?? key);
    this.groupHint.setLabel(groupLabels.length > 0 ? wgULS(`「${groupLabels.join("」「")}」至少填写一项`, `「${groupLabels.join("」「")}」至少填寫一項`) : ""), this.onFormChanged();
  }
  /** 重算「预览」按钮的可用性，并刷新字段级校验提示与组约束提示。 */
  onFormChanged() {
    if (!this.activeSpec)
      return;
    let firstInvalid = validateFields(this.paramFields), groupSatisfied = isGroupSatisfied(this.activeSpec, readValues(this.paramFields));
    this.groupHint.toggle(!groupSatisfied), this.getActions().setAbilities({ preview: firstInvalid === null && groupSatisfied });
  }
  /**
   * 汇总当前表单，产出待预览/提交的内容。校验不过时返回 null 并给出提示。
   * @returns 待预览/提交的内容
   */
  collectSubmission() {
    let spec = this.activeSpec;
    if (!spec || !this.typeConfig)
      return null;
    let firstInvalid = validateFields(this.paramFields);
    if (firstInvalid)
      return firstInvalid.widget.focus(), null;
    if (!isGroupSatisfied(spec, readValues(this.paramFields)))
      return showError(wgULS("内容不完整", "內容不完整"), wgULS("请至少填写组内的一项内容。", "請至少填寫組內的一項內容。")), null;
    let values = readValues(this.paramFields), raw = buildTemplateWikitext(spec, values);
    if (raw === buildTemplateWikitext(spec, {}))
      return showError(wgULS("内容为空", "內容為空"), wgULS("待发送的内容不能为空。", "待傳送的內容不能為空。")), null;
    let targetPage = this.definition.resolveTarget(this.context);
    if (targetPage === !1)
      return showError(wgULS("无法发起请求", "無法發起請求"), wgULS("当前页面没有对应的讨论页。", "目前頁面沒有對應的討論頁。")), null;
    let sectionTitle = this.definition.sectionTitle;
    return {
      targetPage,
      submittedText: buildSubmitText(raw),
      // 章节标题惰性生成：日期取提交时刻，预览停留跨午夜也不会带前一天的日期发出；
      // append 模式（标题由模板正文自带）不提供
      ...sectionTitle === void 0 ? {} : { getSectionTitle: () => sectionTitle({ ...this.context, now: /* @__PURE__ */ new Date() }) },
      ...this.definition.postMode === void 0 ? {} : { postMode: this.definition.postMode },
      ...this.definition.allowCreate === void 0 ? {} : { allowCreate: this.definition.allowCreate },
      editSummary: this.summaryInput.getValue().trim()
    };
  }
};
/**
 * 必须逐项写全：OO.inheritClass 用 Object.create 继承静态成员，
 * { ...OO.ui.ProcessDialog.static } 展开结果是空对象。
 */
__publicField(MainDialog, "static", {
  ...OO.ui.ProcessDialog.static,
  name: "quickrequest-main",
  title: wgULS("快速申请", "快速申請"),
  size: DIALOG_SIZE,
  tagName: "div",
  escapable: !0,
  actions: [
    { action: "preview", label: wgULS("预览", "預覽"), flags: ["primary", "progressive"] },
    // 没有 action 名：OO.ui.Dialog 会自动关闭对话框
    { label: wgULS("取消", "取消"), flags: ["safe"] }
  ]
});

// packages/QuickRequest/src/send.ts
var postTopic = (params) => {
  let summary = params.summary === "" ? {} : { summary: params.summary };
  return getApi().postWithToken("csrf", {
    action: "discussiontoolsedit",
    paction: "addtopic",
    formatversion: 2,
    page: params.page,
    sectiontitle: params.sectionTitle,
    wikitext: params.wikitext,
    ...summary,
    assertuser: mw.config.get("wgUserName") ?? "",
    nocontent: "",
    watchlist: "nochange",
    tags: CHANGE_TAG
  }).then((res) => ({
    ok: !0,
    newrevid: res?.discussiontoolsedit?.newrevid
  })).catch((code, result) => (console.warn("[QuickRequest] 发送失败", code, result), { ok: !1, code, detail: describeSendError(code, result), ambiguous: code === "http" }));
}, appendTopic = (params) => {
  let summary = params.summary === "" ? {} : { summary: params.summary };
  return getApi().postWithToken("csrf", {
    action: "edit",
    formatversion: 2,
    title: params.page,
    appendtext: `
${params.wikitext}
`,
    ...params.allowCreate === !0 ? {} : { nocreate: !0 },
    assertuser: mw.config.get("wgUserName") ?? "",
    watchlist: "nochange",
    tags: CHANGE_TAG,
    ...summary
  }).then((res) => ({
    ok: !0,
    newrevid: res?.edit?.newrevid
  })).catch((code, result) => (console.warn("[QuickRequest] 发送失败", code, result), { ok: !1, code, detail: describeSendError(code, result), ambiguous: code === "http" }));
}, fetchLastSectionAnchor = async (revid, sectionTitle) => {
  if (!revid)
    return "";
  try {
    let sections = (await getApi().post({
      action: "parse",
      oldid: revid,
      prop: "sections",
      formatversion: 2
    })).parse?.sections ?? [];
    return (sectionTitle === void 0 ? sections.at(-1) : sections.filter((section) => section.line === sectionTitle).at(-1) ?? sections.at(-1))?.anchor ?? "";
  } catch (error) {
    return console.warn("[QuickRequest] 读取新章节锚点失败", error), "";
  }
}, newSectionUrl = (page, anchor) => {
  let url = mw.util.getUrl(page);
  return anchor === "" ? url : `${url}#${encodeURIComponent(anchor)}`;
}, gotoNewSection = (page, anchor) => {
  let url = newSectionUrl(page, anchor);
  if (mw.config.get("wgPageName") === page.replace(/ /g, "_")) {
    location.hash = new URL(url, location.href).hash, location.reload();
    return;
  }
  location.assign(url);
};

// packages/QuickRequest/src/previewDialog.ts
var PreviewDialog = class extends OO.ui.ProcessDialog {
  constructor() {
    super(...arguments);
    __publicField(this, "payload", null);
    __publicField(this, "getWarnings");
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
      label: wgULS("待提交的 wikitext", "待提交的 wikitext"),
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
   * 从打开数据里取出渲染结果、发送参数与确认项提供者。
   * @param data 打开数据
   * @returns 设置流程
   */
  getSetupProcess(data) {
    return super.getSetupProcess(data).next(() => {
      let payload = data;
      this.htmlPanel.$element.html(payload.previewHtml), this.wikitextInput.setValue(payload.submittedText), this.wikitextToggle.setValue(!1), this.wikitextLayout.toggle(!1), this.getActions().setAbilities({ send: !0 }), this.payload = payload, this.getWarnings = payload.getWarnings;
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
        let payload = this.payload;
        if (!(this.sending || !payload)) {
          this.setSending(!0);
          try {
            let warnings = this.getWarnings === void 0 ? [] : await this.getWarnings();
            for (let warning of warnings)
              if (await confirmContinue(warning.title, warning.message) !== "continue") {
                this.setSending(!1);
                return;
              }
            let append = payload.postMode === "append", sectionTitle = append ? "" : payload.getSectionTitle?.() ?? "";
            for (; ; ) {
              let result = append ? await appendTopic({
                page: payload.targetPage,
                wikitext: payload.submittedText,
                summary: payload.editSummary,
                ...payload.allowCreate === void 0 ? {} : { allowCreate: payload.allowCreate }
              }) : await postTopic({
                page: payload.targetPage,
                sectionTitle,
                wikitext: payload.submittedText,
                summary: payload.editSummary
              });
              if (result.ok) {
                let anchor = await fetchLastSectionAnchor(result.newrevid, append ? void 0 : sectionTitle);
                this.close({ action: "sent", anchor });
                return;
              }
              if ((result.ambiguous ? await confirmAmbiguousRetry(wgULS("发送结果未知", "發送結果未知"), result.detail) : await confirmRetry(wgULS("发送失败", "傳送失敗"), result.detail)) !== "retry") {
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
   * 提交中禁用两个按钮并改文案，防止重复投递。
   * @param sending 是否正在提交
   */
  setSending(sending) {
    this.sending = sending, this.getActions().setAbilities({ send: !sending, back: !sending }), this.getActions().get({ actions: "send" }).at(0)?.setLabel(sending ? wgULS("正在提交…", "正在提交…") : wgULS("提交请求", "提交請求"));
  }
};
/** 见 MainDialog 中关于 static 必须写全的说明。 */
__publicField(PreviewDialog, "static", {
  ...OO.ui.ProcessDialog.static,
  name: "quickrequest-preview",
  title: wgULS("预览", "預覽"),
  size: DIALOG_SIZE,
  tagName: "div",
  escapable: !0,
  actions: [
    { action: "send", label: wgULS("提交请求", "提交請求"), flags: ["primary", "progressive"] },
    { action: "back", label: wgULS("返回", "返回"), flags: ["safe"] }
  ]
});

// packages/QuickRequest/src/index.ts
mountEntries();
var describeConfigFailure = (reason) => wgULS(`${CONFIG_PAGE} 读取或解析失败：${reason}`, `${CONFIG_PAGE} 讀取或解析失敗：${reason}`), openPreview = (data, mainDialog) => {
  openWindow(new PreviewDialog({ size: DIALOG_SIZE }), data, (result) => {
    result?.action === "sent" && (mainDialog.close(), mw.notify(wgULS("提交成功，3 秒后跳转", "提交成功，3 秒後跳轉"), { type: "success" }), window.setTimeout(() => {
      gotoNewSection(data.targetPage, result.anchor ?? "");
    }, 3e3));
  });
}, open = (type, preset) => {
  let definition = resolveRequestType(type, mw.config.get("wgPageName"));
  if (!definition) {
    console.warn("[QuickRequest] 未知的请求类型", type);
    return;
  }
  let context = buildContext(mw.config.get("wgUserName") ?? "");
  if (!definition.availability(context)) {
    mw.notify(wgULS("您暂不满足发起此请求的条件。", "您暫不滿足發起此請求的條件。"), { type: "warn" });
    return;
  }
  if (definition.resolveTarget(context) === !1) {
    showError(wgULS("无法发起请求", "無法發起請求"), wgULS("当前页面没有对应的讨论页。", "目前頁面沒有對應的討論頁。"));
    return;
  }
  let configPromise = prefetchConfig(), mainDialog = new MainDialog({ size: DIALOG_SIZE }), data = {
    definition,
    context,
    ...preset === void 0 ? {} : { preset },
    configPromise,
    onPreview: (previewData) => {
      openPreview(previewData, mainDialog);
    }
  };
  openWindow(mainDialog, data, (result) => {
    if (result?.action === "configError") {
      showError(wgULS("无法加载请求配置", "無法載入請求組態"), describeConfigFailure(result.message));
      return;
    }
    result?.action === "formError" && showError(wgULS("界面构建失败", "介面建構失敗"), wgULS(`无法生成表单：${result.message}`, `無法產生表單：${result.message}`));
  });
};
window.libQuickRequest = { open };
