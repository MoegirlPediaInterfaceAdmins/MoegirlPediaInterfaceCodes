"use strict";
(() => {
    /** 修改默认模板请到对应 JSON 文件进行，参数说明参见[[Help:UserMessages]] */
    const CONFIG_PAGE = "MediaWiki:Gadget-UserMessages.json";
    const STORAGE_KEY = "usermessages-state";
    const DIALOG_SIZE = "large";
    const MAX_MAIN_BODY_HEIGHT = 520;
    const MAX_PREVIEW_BODY_HEIGHT = 560;
    const REDIRECT_DELAY = 3000;

    /** 允许出现入口的命名空间：2 = User，3 = User talk，-1 = Special。 */
    const ALLOWED_NAMESPACES = [2, 3, -1];

    /** 允许出现入口的特殊页（仅当命名空间为 -1 时判断）。 */
    const ALLOWED_SPECIAL_PAGES = ["Contributions", "DeletedContributions", "Block", "Log"];

    /** 尾随签名的默认值，可被 window.UserMessages.signatureSuffix 覆盖。 */
    const DEFAULT_SIGNATURE_SUFFIX = " ——~~~~";

    /**
     * 目标用户的讨论页标题。
     * 预览（parse 的 title）与实际发送（edit 的 title）必须指向同一个页面，故此处在两边共用。
     * @param {string} user 用户名，不含命名空间前缀
     * @returns {string} 讨论页标题
     */
    const talkPageTitle = (user) => `User talk:${user}`;

    /**
     * 把任意抛出的值转成可读文案。
     * @param {unknown} error 被抛出的值
     * @returns {string} 可读文案
     */
    const toErrorMessage = (error) => error instanceof Error ? error.message : String(error);

    /** 已知错误码 → 中文说明。 */
    const ERROR_MESSAGES = {
        badtoken: wgULS("登录令牌已失效，请刷新页面后重试。", "登入權杖已失效，請重新整理頁面後再試。"),
        assertnameduserfailed: wgULS("当前登录状态已失效（可能已在别处退出登录），请刷新页面后重新登录。", "目前登入狀態已失效（可能已在別處登出），請重新整理頁面後重新登入。"),
        ratelimited: wgULS("操作过于频繁，已被限流，请稍后再试。", "操作過於頻繁，已受到頻率限制，請稍後再試。"),
        permissiondenied: wgULS("权限不足，无法编辑该讨论页。", "權限不足，無法編輯該討論頁。"),
        blocked: wgULS("您当前的账号或 IP 已被封禁，无法编辑。", "您目前的帳號或 IP 已被封鎖，無法編輯。"),
        spamdetected: wgULS("内容被防滥用过滤器判定为垃圾信息，已被拒绝。", "內容被防濫用過濾器判定為垃圾資訊，已被拒絕。"),
        articleexists: wgULS("目标页面已存在，无法新建。", "目標頁面已存在，無法建立。"),
        readonly: wgULS("本站当前处于只读状态，暂时无法编辑。", "本站目前處於唯讀狀態，暫時無法編輯。"),
    };

    /**
     * 从 API 的 reject 载荷里取出服务端给的 info 文案。
     * @param {unknown} result reject 的第二个参数
     * @returns {string} 服务端 info 文案；取不到时为空串
     */
    const extractInfo = (result) => {
        if (typeof result !== "object" || result === null) {
            return "";
        }
        return result.error?.info ?? result.errors?.[0]?.info ?? "";
    };

    /**
     * 把 API 错误码翻译成中文说明。
     * @param {string} code 错误码，来自 postWithToken 的多参 reject 的第一个参数
     * @param {unknown} [result] reject 的第二个参数，形如 { error: { code, info } }
     * @returns {string} 中文说明
     */
    const describeSendError = (code, result) => {
        const info = extractInfo(result);
        // 用 hasOwn 而非直接下标：code 来自服务端，直接取值会命中原型链上的键（如 toString）
        const known = Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : undefined;
        if (known) {
            return info ? `${known}（${info}）` : known;
        }
        if (code.startsWith("abusefilter")) {
            return wgULS(`被防滥用过滤器阻止（${code}）${info ? `：${info}` : ""}`, `被防濫用過濾器阻止（${code}）${info ? `：${info}` : ""}`);
        }
        return wgULS(`发送失败（${code}）${info ? `：${info}` : ""}`, `傳送失敗（${code}）${info ? `：${info}` : ""}`);
    };

    const api = new mw.Api();

    /**
     * 读取页面的 wikitext。
     * @param {string} title 页面名
     * @returns {Promise<string>} 页面内容；页面不存在时为空字符串
     */
    const fetchPageContent = async (title) => {
        const res = await api.post({
            action: "query",
            titles: title,
            prop: "revisions",
            rvprop: "content",
            formatversion: 2,
        });
        return res.query?.pages?.[0]?.revisions?.[0]?.content ?? "";
    };

    /**
     * 读取页面的 wikitext，页面不存在或内容为空时抛错。
     * 自定义模式用它，避免把空页面静默地变成一个空编辑器。
     * @param {string} title 页面名
     * @returns {Promise<string>} 页面内容
     */
    const fetchPageContentOrThrow = async (title) => {
        const content = await fetchPageContent(title);
        if (content.trim() === "") {
            throw new Error(wgULS(`页面 ${title} 不存在或内容为空`, `頁面 ${title} 不存在或內容為空`));
        }
        return content;
    };

    /**
     * 用 action=parse 渲染 wikitext 为 HTML（预览用）。
     *
     * 正文常带 {{subst:}} 与签名（~~~~），而真实页面是「存盘时 PST、浏览时再解析」：
     * pst=true 让服务端先做保存前变换、再解析变换后的文本，一次调用即得到与保存后一致的渲染。
     * 注意：formatversion=2 下 parse.text 是纯字符串，不是 { '*': ... }。
     *
     * title 必须传正文将要落到的页面：不传时解析上下文是 "API"，{{PAGENAME}} / {{SUBJECTPAGENAME}}
     * 等会渲染出与真实保存结果不同的内容，PST 也拿不到正确的页面上下文。
     * @param {string} wikitext 待渲染的 wikitext
     * @param {string} title 正文所属页面，给解析器提供页面上下文
     * @returns {Promise<string>} 渲染出的 HTML
     */
    const parseWikitext = async (wikitext, title) => {
        const res = await api.post({
            action: "parse",
            title,
            text: wikitext,
            contentmodel: "wikitext",
            pst: true,
            disablelimitreport: true,
            formatversion: 2,
            wrapoutputclass: "mw-parser-output",
        });
        return res.parse?.text ?? "";
    };

    /** 合法的控件类型集合。 */
    const PARAM_TYPES = new Set(["page", "user", "text", "multiline"]);

    /**
     * 判断是否为合法的控件类型。
     * @param {unknown} value 待判断的值
     * @returns {boolean} 是否合法
     */
    const isParamType = (value) => typeof value === "string" && PARAM_TYPES.has(value);

    /**
     * 滤掉校验未通过的条目。
     * @param {(object | null)[]} items 待过滤的条目
     * @returns {object[]} 合法条目
     */
    const compact = (items) => items.filter((item) => item !== null);

    /** 模块级预取 promise（幂等）。 */
    let prefetch = null;

    /** 预取结果快照，未落定时为 null。 */
    let settled = null;

    /**
     * 判断是否为非空字符串。
     * @param {unknown} value 待判断的值
     * @returns {boolean} 是否非空
     */
    const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

    /**
     * 校验单个参数定义，非法则返回 null。
     * @param {unknown} raw 原始条目
     * @returns {object | null} 参数定义；非法时为 null
     */
    const toTemplateParam = (raw) => {
        if (typeof raw !== "object" || raw === null) {
            return null;
        }
        const { key, label, type, required, "default": defaultValue } = raw;
        if (!isNonEmptyString(key) || !isNonEmptyString(label)) {
            return null;
        }
        const param = { key, label };
        if (isParamType(type)) {
            param.type = type;
        }
        if (typeof required === "boolean") {
            param.required = required;
        }
        if (typeof defaultValue === "string") {
            param.default = defaultValue;
        }
        return param;
    };

    /**
     * 校验单个模板条目，非法则返回 null。
     * @param {unknown} raw 原始条目
     * @returns {object | null} 模板条目；非法时为 null
     */
    const toTemplateEntry = (raw) => {
        if (typeof raw !== "object" || raw === null) {
            return null;
        }
        const { title, template, summary, parameters } = raw;
        if (!isNonEmptyString(title) || !isNonEmptyString(template)) {
            return null;
        }
        const entry = {
            title,
            template,
            summary: typeof summary === "string" ? summary : "",
        };
        if (Array.isArray(parameters)) {
            entry.parameters = compact(parameters.map(toTemplateParam));
        }
        return entry;
    };

    /**
     * 解析并校验配置页内容。非法条目静默丢弃；全部非法时视为失败。
     * @param {string} raw 配置页的原始文本
     * @returns {object} 配置结果
     */
    const parseConfig = (raw) => {
        if (raw.trim() === "") {
            return { ok: false, message: wgULS(`页面 ${CONFIG_PAGE} 不存在或内容为空`, `頁面 ${CONFIG_PAGE} 不存在或內容為空`) };
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return { ok: false, message: wgULS(`JSON 解析失败：${toErrorMessage(error)}`, `JSON 解析失敗：${toErrorMessage(error)}`) };
        }

        const templates = parsed?.templates;
        if (!Array.isArray(templates)) {
            return { ok: false, message: wgULS(`${CONFIG_PAGE} 缺少 templates 数组`, `${CONFIG_PAGE} 缺少 templates 陣列`) };
        }

        const valid = compact(templates.map(toTemplateEntry));
        if (valid.length === 0) {
            return { ok: false, message: wgULS(`${CONFIG_PAGE} 的模板列表为空或格式不正确`, `${CONFIG_PAGE} 的模板列表為空或格式不正確`) };
        }
        return { ok: true, config: { templates: valid } };
    };

    /**
     * 读取并校验 window.UserMessages.templates，非法条目静默丢弃。
     * @returns {object[]} 自定义模板列表
     */
    const parseCustomTemplates = () => {
        const raw = window.UserMessages?.templates;
        if (!Array.isArray(raw)) {
            return [];
        }
        return compact(raw.map(toTemplateEntry));
    };

    /**
     * 取尾随签名。window.UserMessages.signatureSuffix 优先，未配置时用源码里的默认值。
     * 只判断类型：空串是合法配置，表示不加签名。
     * @returns {string} 尾随签名
     */
    const getSignatureSuffix = () => {
        const configured = window.UserMessages?.signatureSuffix;
        return typeof configured === "string" ? configured : DEFAULT_SIGNATURE_SUFFIX;
    };

    /**
     * 合并预置与自定义模板：同名 title 由自定义覆盖预置，自定义统一置于末尾。
     * @param {object[]} preset 预置模板
     * @param {object[]} custom 自定义模板
     * @returns {object[]} 合并后的模板列表
     */
    const mergeTemplates = (preset, custom) => {
        const customTitles = new Set(custom.map((entry) => entry.title));
        const kept = preset.filter((entry) => !customTitles.has(entry.title));
        return [...kept, ...custom];
    };

    /**
     * 启动模板配置预取。幂等，入口初始化时调用一次即可。
     * 预置（配置页）与自定义（window.UserMessages.templates）在此合并：
     * 自定义追加在预置之后并覆盖同名项；配置页失败但有自定义时降级为仅用自定义。
     * 永不 reject：失败会被转成 { ok: false } 结果。
     * @returns {Promise<object>} 配置结果
     */
    const prefetchConfig = () => {
        prefetch ??= (async () => {
            let preset;
            try {
                preset = parseConfig(await fetchPageContent(CONFIG_PAGE));
            } catch (error) {
                preset = { ok: false, message: toErrorMessage(error) };
            }

            const custom = parseCustomTemplates();
            if (preset.ok) {
                settled = { ok: true, config: { templates: mergeTemplates(preset.config.templates, custom) } };
            } else if (custom.length > 0) {
                settled = { ok: true, config: { templates: custom } };
            } else {
                settled = preset;
            }
            return settled;
        })();
        return prefetch;
    };

    /**
     * 取预取结果快照，供入口在打开对话框前做同步判断。
     * @returns {object | null} 已落定的结果；尚未落定时为 null
     */
    const getSettledConfig = () => settled;

    /**
     * 按 title 查找模板。
     * @param {object} config 配置
     * @param {string} title 模板 title
     * @returns {object | undefined} 模板条目
     */
    const findTemplate = (config, title) => config.templates.find((entry) => entry.title === title);

    /**
     * 按参数类型创建控件。
     * mw.widgets.TitleInputWidget / mw.widgets.UserInputWidget 与 MultilineTextInputWidget
     * 都继承自 TextInputWidget，因此统一以 TextInputWidget 返回，便于共用 getValue / setValidityFlag。
     * @param {object} param 参数定义
     * @param {JQuery<HTMLElement>} $overlay 窗口的 overlay 节点，交给带弹出层的控件，避免菜单被窗口 body 裁剪
     * @returns {OO.ui.TextInputWidget} 控件
     */
    const createParamWidget = (param, $overlay) => {
        const value = param.default ?? "";
        switch (param.type ?? "text") {
            case "page":
                return new mw.widgets.TitleInputWidget({ value, suggestions: true, $overlay });
            case "user":
                return new mw.widgets.UserInputWidget({ value, $overlay });
            case "multiline":
                return new OO.ui.MultilineTextInputWidget({ value, rows: 4, autosize: true, maxRows: 12 });
            default:
                return new OO.ui.TextInputWidget({ value });
        }
    };

    /**
     * 创建参数控件并包一层 FieldLayout，同时接上值变化回调。
     * @param {object} param 参数定义
     * @param {JQuery<HTMLElement>} $overlay 窗口的 overlay 节点
     * @param {() => void} onChange 值变化时的回调
     * @returns {object} 参数控件、布局与校验状态
     */
    const createParamField = (param, $overlay, onChange) => {
        const widget = createParamWidget(param, $overlay);
        widget.on("change", onChange);
        return {
            param,
            widget,
            layout: new OO.ui.FieldLayout(widget, { label: param.label, align: "top" }),
            flagged: false,
        };
    };

    /**
     * 读取各参数的当前值。
     * @param {object[]} fields 参数控件列表
     * @returns {Record<string, string>} 参数名 → 值
     */
    const readValues = (fields) => Object.fromEntries(fields.map(({ param, widget }) => [param.key, widget.getValue()]));

    /**
     * 校验必填项，就地更新控件的 validity 与错误文案。
     * 只在有效性翻转时才动 DOM —— 本函数每次输入都会跑，无脑重设会每键重建错误提示节点。
     * @param {object[]} fields 参数控件列表
     * @returns {object | null} 第一个非法字段；全部合法时为 null
     */
    const validateFields = (fields) => {
        let firstInvalid = null;
        for (const field of fields) {
            const invalid = (field.param.required ?? false) && field.widget.getValue().trim() === "";
            if (invalid !== field.flagged) {
                field.flagged = invalid;
                field.widget.setValidityFlag(!invalid);
                field.layout.setErrors(invalid ? [wgULS(`${field.param.label}不能为空`, `${field.param.label}不能為空`)] : []);
            }
            if (invalid && !firstInvalid) {
                firstInvalid = field;
            }
        }
        return firstInvalid;
    };

    /** 兜底状态。 */
    const DEFAULT_STATE = { templateTitle: "", editSummary: "" };

    /**
     * 读取本地状态。逐字段校验类型，任何非法值都回落到默认值。
     * @returns {{ templateTitle: string, editSummary: string }} 本地状态
     */
    const loadPersisted = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return { ...DEFAULT_STATE };
            }
            const parsed = JSON.parse(raw);
            return {
                templateTitle: typeof parsed.templateTitle === "string" ? parsed.templateTitle : "",
                editSummary: typeof parsed.editSummary === "string" ? parsed.editSummary : "",
            };
        } catch (error) {
            console.warn("[UserMessages] 读取本地状态失败，使用默认值", error);
            return { ...DEFAULT_STATE };
        }
    };

    /**
     * 合并写入本地状态。写入失败（如隐私模式）静默忽略，不影响主流程。
     * @param {object} patch 需要更新的字段
     */
    const savePersisted = (patch) => {
        try {
            const current = loadPersisted();
            const next = { ...current, ...patch };
            // 值没变就不写：代码里的 setValue 同样会触发 change，没必要重复落盘
            if (next.templateTitle === current.templateTitle && next.editSummary === current.editSummary) {
                return;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
            console.warn("[UserMessages] 写入本地状态失败", error);
        }
    };

    /**
     * 由预设模板与参数值拼出 wikitext。值为空的参数整段省略，不输出 |key=。
     * @param {object} tpl 模板定义
     * @param {Record<string, string>} values 参数名 → 值
     * @returns {string} 拼出的 wikitext
     */
    const buildPresetWikitext = (tpl, values) => {
        const params = (tpl.parameters ?? [])
            .map(({ key }) => {
                const value = values[key];
                return value ? `|${key}=${value}` : "";
            })
            .join("");

        return `{{${tpl.template}${params}}}`;
    };

    /**
     * 把开头的 {{ 改写为 {{subst:。正则锚定在字符串起始处，模板内部嵌套的 {{ 不受影响。
     * @param {string} wikitext 原始 wikitext
     * @returns {string} 改写后的 wikitext
     */
    const toSubst = (wikitext) => wikitext.replace(/^\{\{/, "{{subst:");

    /**
     * 去除 <noinclude> 块与 <includeonly> 标签，得到可直接编辑的模板正文。
     * @param {string} source 模板页的原始 wikitext
     * @returns {string} 模板正文
     */
    const stripNoInclude = (source) => source
        .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, "")
        .replace(/<\/?includeonly>/gi, "")
        .trim();

    /**
     * 由待发送的 wikitext 得到最终提交正文：非自定义模式施加 subst 改写，再补签名。
     *
     * 这是唯一一处做这两步变换的地方 —— 预览与实际发送共用它，
     * 保证「预览里看到的」与「真正提交的」逐字一致。
     * @param {string} wikitext 原始 wikitext
     * @param {boolean} customMode 自定义模式（不加 subst）
     * @param {string} signatureSuffix 尾随签名，取自配置
     * @returns {string} 最终提交正文
     */
    const buildSubmitText = (wikitext, customMode, signatureSuffix) => {
        const body = customMode ? wikitext : toSubst(wikitext);
        return `${body}${signatureSuffix}`;
    };

    /**
     * 把对话框挂到独立的 WindowManager 上并打开，关闭后自动清理并回调。
     *
     * 每个对话框都挂到 document.body 是嵌套弹窗（预览框之上再弹错误框）能正常工作的前提：
     * WindowManager 的 toggleIsolation 会跳过已被其它 manager 标记 aria-hidden / inert 的兄弟节点，
     * 因此多个 manager 可以叠加，而不会互相解除隔离。
     *
     * @param {OO.ui.Dialog} dialog 对话框实例
     * @param {object} data 打开数据，在 getSetupProcess 中读取
     * @param {(result: object | undefined) => void} [onClosed] 关闭后的回调，携带 close() 传入的数据
     */
    const openWindow = (dialog, data, onClosed) => {
        const manager = new OO.ui.WindowManager();
        $(document.body).append(manager.$element);
        manager.addWindows([dialog]);

        const instance = manager.openWindow(dialog, data);
        // 关闭时兑现，兑现值即 close() 传入的数据
        const closed = instance.closed;
        /* eslint-disable promise/prefer-await-to-then -- 关闭回调是 fire-and-forget 的清理流程，jQuery Promise 的 then/catch 不等价于 await */
        void closed
            .then((result) => {
                manager.$element.remove();
                manager.destroy();
                onClosed?.(result);
            })
            .catch((error) => {
                console.error("[UserMessages] 关闭回调异常", error);
            });
        /* eslint-enable promise/prefer-await-to-then */
    };

    /**
     * 打开一个消息对话框并等待关闭。
     * @param {{ title: string, message: string | JQuery<HTMLElement> }} spec 消息内容
     * @param {OO.ui.ActionWidget.ConfigOptions[]} actions 底部动作
     * @returns {Promise<string>} 关闭时按下的动作名；按 Esc 关闭（无数据）统一归一化为 'close'
     */
    const showMessage = (spec, actions) => new Promise((resolve) => {
        const data = { title: spec.title, message: spec.message, actions };
        openWindow(new OO.ui.MessageDialog(), data, (result) => {
            resolve(result?.action ?? "close");
        });
    });

    /**
     * 只带「关闭」按钮的错误提示，调用方无需等待。
     * @param {string} title 标题
     * @param {string} message 正文
     * @returns {Promise<void>} 提示流程结束后兑现
     */
    const showError = async (title, message) => {
        try {
            await showMessage({ title, message }, [{ action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] }]);
        } catch (error) {
            // openWindow 仍可能同步抛错（如 OOUI 未就绪），兜住以免留下未处理的 rejection
            console.error("[UserMessages] 错误提示无法显示", error);
        }
    };

    /**
     * 发送失败时的「关闭 / 重试」对话框。
     * @param {string} title 标题
     * @param {string} message 正文
     * @returns {Promise<'retry' | 'close'>} 用户的选择
     */
    const confirmRetry = async (title, message) => {
        const action = await showMessage({ title, message }, [
            { action: "close", label: wgULS("关闭", "關閉"), flags: ["safe"] },
            { action: "retry", label: wgULS("重试", "重試"), flags: ["primary", "progressive"] },
        ]);
        return action === "retry" ? "retry" : "close";
    };

    /**
     * 向目标用户讨论页追加一个新章节。
     *
     * 用 .then(onOk, onError) 而非 try/catch：postWithToken 以 (code, result, ...) 多参 reject，
     * await 只会拿到第一个参数（错误码），会丢掉 result.error.info。
     *
     * 失败不抛错，返回判别联合以便上层「重试」；成功时带回 newrevid，供上层回读新章节锚点。
     * @param {{ targetUser: string, text: string, summary: string }} params 发送参数
     * @returns {Promise<{ ok: true, newrevid: number | undefined } | { ok: false, code: string, detail: string }>} 发送结果
     */
    /* eslint-disable promise/prefer-await-to-then -- 多参 reject 无法用 await 取到 result，必须用 .catch 的第二个形参 */
    const sendEdit = (params) => api
        .postWithToken("csrf", {
            action: "edit",
            assertuser: mw.config.get("wgUserName") ?? "",
            formatversion: 2,
            title: talkPageTitle(params.targetUser),
            section: "new",
            sectiontitle: "",
            text: params.text,
            summary: params.summary,
            tags: "Automation tool|UserMessages",
        })
        .then((res) => ({ ok: true, newrevid: res?.edit?.newrevid }))
        .catch((code, result) => {
            console.warn("[UserMessages] 发送失败", code, result);
            return { ok: false, code, detail: describeSendError(code, result) };
        });
    /* eslint-enable promise/prefer-await-to-then */

    /**
     * 读取指定修订里最后一个章节的锚点。
     *
     * 新章节的标题由模板自身给出（如「提醒：请勿人身攻击」），小工具事先无从得知，所以锚点只能保存后回读：
     * prop=sections 按文档顺序列出目录，而新章节是追加在页尾的，故最后一项就是刚发出的那节。
     * 传 oldid 而非 page，是为了把解析固定在刚保存的修订上，避免期间有人编辑导致目录位移。
     *
     * 取不到时返回空串（例如模板本身没有标题，内容会并入上一节），由调用方退化为不带锚点的跳转。
     * @param {number | undefined} revid 刚保存的修订 ID
     * @returns {Promise<string>} 章节锚点；取不到时为空串
     */
    const fetchLastSectionAnchor = async (revid) => {
        if (!revid) {
            return "";
        }
        try {
            const res = await api.post({
                action: "parse",
                oldid: revid,
                prop: "sections",
                formatversion: 2,
            });
            const sections = res.parse?.sections ?? [];
            return sections.at(-1)?.anchor ?? "";
        } catch (error) {
            console.warn("[UserMessages] 读取新章节锚点失败", error);
            return "";
        }
    };

    /**
     * 目标用户讨论页新章节的 URL。锚点为空时只给讨论页。
     * @param {string} user 用户名，不含命名空间前缀
     * @param {string} anchor 章节锚点
     * @returns {string} URL
     */
    const newSectionUrl = (user, anchor) => {
        const url = mw.util.getUrl(talkPageTitle(user));
        return anchor === "" ? url : `${url}#${encodeURIComponent(anchor)}`;
    };

    /**
     * 在当前标签页跳到目标用户讨论页的新章节。
     *
     * 已经身处目标讨论页时不能直接 location.assign：只有 hash 不同属同文档导航，页面不会重新加载，
     * 而新章节并不在现有 DOM 里，浏览器只会静默地不滚动。故先写入 hash 再 reload，让新文档按锚点定位。
     * @param {string} user 用户名，不含命名空间前缀
     * @param {string} anchor 章节锚点；为空时跳到讨论页顶部
     */
    const gotoNewSection = (user, anchor) => {
        const url = newSectionUrl(user, anchor);
        if (mw.config.get("wgPageName") === talkPageTitle(user).replace(/ /g, "_")) {
            location.hash = new URL(url, location.href).hash;
            location.reload();
            return;
        }
        location.assign(url);
    };

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
        static static = {
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

        targetUser = "";
        onPreview;
        selected = null;
        paramFields = [];
        customMode = false;
        loadingCustom = false;

        loadingPanel;
        formPanel;
        templateDropdown;
        customCheckbox;
        customStatus;
        paramFieldset;
        customPanel;
        customInput;
        summaryInput;

        /**
         * 搭出「加载中」与「表单」两个容器，不碰配置（此时模板列表还未知）。
         * @returns {this} 本实例
         */
        initialize() {
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
         * @param {object} [data] 打开数据
         * @returns {OO.ui.Process} 设置流程
         */
        getSetupProcess(data) {
            return super.getSetupProcess(data).next(
                async () => {
                    const { targetUser, configPromise, onPreview } = data;
                    this.targetUser = targetUser;
                    this.onPreview = onPreview;
                    this.getActions().setAbilities({ preview: false });

                    // configPromise 承诺不 reject，catch 只是兜底；步骤内绝不能抛，
                    // 一旦 reject，OOUI 会显示它内置的英文错误界面
                    const result = await configPromise.catch((error) => ({ ok: false, message: toErrorMessage(error) }));
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
                },
                this,
            );
        }

        /**
         * 处理底部动作：仅拦截 preview，其余交给父类。
         * 不手动 pushPending：OOUI 的 executeAction 已在整个流程（含其中的 await）外挂了一层 pending。
         * @param {string} [action] 动作名
         * @returns {OO.ui.Process} 动作流程
         */
        getActionProcess(action) {
            if (action !== "preview") {
                return super.getActionProcess(action);
            }
            return new OO.ui.Process(
                async () => {
                    const submission = this.collectSubmission();
                    if (!submission) {
                        return;
                    }

                    let previewHtml;
                    try {
                        previewHtml = await parseWikitext(
                            submission.submittedText,
                            talkPageTitle(submission.targetUser),
                        );
                    } catch (error) {
                        showError(wgULS("预览失败", "預覽失敗"), wgULS(`无法渲染预览：${toErrorMessage(error)}`, `無法產生預覽：${toErrorMessage(error)}`));
                        return;
                    }

                    const data = {
                        title: wgULS(`预览：${submission.templateTitle}`, `預覽：${submission.templateTitle}`),
                        targetUser: submission.targetUser,
                        previewHtml,
                        submittedText: submission.submittedText,
                        editSummary: submission.editSummary,
                    };
                    this.onPreview?.(data);
                },
                this,
            );
        }

        /**
         * 内容区最大高度，超出则滚动。
         * @returns {number} 高度（px）
         */
        getBodyHeight() {
            return Math.min(super.getBodyHeight(), MAX_MAIN_BODY_HEIGHT);
        }

        /**
         * 构建表单。仅在配置就绪后调用一次。
         * @param {object} config 已校验的模板配置
         */
        buildForm(config) {
            const persisted = loadPersisted();
            const find = (title) => findTemplate(config, title);
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
                const item = Array.isArray(items) ? items[0] : items;
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
            this.customInput.on("change", () => this.onFormChanged());
            this.customPanel = new OO.ui.PanelLayout({ padded: false, expanded: false });
            this.customPanel.$element.append(
                new OO.ui.FieldLayout(this.customInput, { label: wgULS("自定义内容", "自訂內容"), align: "top" }).$element,
            );
            this.customPanel.toggle(false);
            fieldset.addItems([this.customPanel]);

            this.summaryInput = new OO.ui.TextInputWidget({ value: persisted.editSummary });
            this.summaryInput.on("change", () => savePersisted({ editSummary: this.summaryInput.getValue() }));
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
         * @param {boolean} enabled 是否切到自定义内容
         */
        setCustomMode(enabled) {
            this.customMode = enabled;
            this.customCheckbox.setSelected(enabled);
            this.customPanel.toggle(enabled);
            this.paramFieldset.toggle(!enabled);
        }

        /**
         * 切换到某个模板：重置自定义模式、重建参数区、重新填入摘要。
         * @param {object} template 选中的模板
         */
        applyTemplate(template) {
            this.selected = template;
            this.setCustomMode(false);
            this.customInput.setValue("");

            this.paramFields = (template.parameters ?? []).map((param) =>
                createParamField(param, this.$overlay, () => this.onFormChanged()),
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
        onFormChanged() {
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
         * @returns {Promise<void>} 完成时兑现
         */
        async loadCustomSource() {
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
                showError(wgULS("加载失败", "載入失敗"), wgULS(`无法加载 ${template.template} 的源代码：${toErrorMessage(error)}`, `無法載入 ${template.template} 的原始碼：${toErrorMessage(error)}`));
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
         * @returns {object | null} 待预览/提交的内容
         */
        collectSubmission() {
            if (!this.selected) {
                showError(wgULS("未选择模板", "未選擇模板"), wgULS("请先选择一个提醒模板。", "請先選擇一個提醒模板。"));
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
                showError(wgULS("内容为空", "內容為空"), wgULS("待发送的内容不能为空。", "待傳送的內容不能為空。"));
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

    /**
     * 预览对话框：展示 action=parse 渲染出的 HTML，可折叠查看待提交正文，并执行发送。
     *
     * 发送失败时本对话框保持开启、输入原样保留，「重试」直接在同一流程内重新提交。
     */
    class PreviewDialog extends OO.ui.ProcessDialog {
        /** 见 MainDialog 中关于 static 必须写全的说明。 */
        static static = {
            ...OO.ui.ProcessDialog.static,
            name: "usermessages-preview",
            title: wgULS("预览", "預覽"),
            size: DIALOG_SIZE,
            tagName: "div",
            escapable: true,
            actions: [
                { action: "send", label: wgULS("发送提醒", "傳送提醒"), flags: ["primary", "progressive"] },
                { action: "back", label: "返回", flags: ["safe"] },
            ],
        };

        sendParams = null;
        sending = false;

        htmlPanel;
        contentPanel;
        wikitextToggle;
        wikitextInput;
        wikitextLayout;

        /**
         * 搭出预览区与可折叠的 wikitext 区。
         * @returns {this} 本实例
         */
        initialize() {
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
                label: "待提交的 wikitext",
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
         * 从打开数据里取出渲染结果与待提交正文。
         * @param {object} [data] 打开数据
         * @returns {OO.ui.Process} 设置流程
         */
        getSetupProcess(data) {
            return super.getSetupProcess(data).next(() => {
                const payload = data;
                this.htmlPanel.$element.html(payload.previewHtml);
                this.wikitextInput.setValue(payload.submittedText);
                this.wikitextToggle.setValue(false);
                this.wikitextLayout.toggle(false);
                this.sendParams = {
                    targetUser: payload.targetUser,
                    text: payload.submittedText,
                    summary: payload.editSummary,
                };
            }, this);
        }

        /**
         * 内容已插入可见 DOM 后再触发 wikipage.content，
         * 让 <gallery>、折叠元素等依赖 JS 初始化的内容在预览里也能正常工作。
         * @param {object} [data] 打开数据
         * @returns {OO.ui.Process} 就绪流程
         */
        getReadyProcess(data) {
            return super.getReadyProcess(data).next(() => {
                mw.hook("wikipage.content").fire(this.htmlPanel.$element);
            }, this);
        }

        /**
         * 处理底部动作：拦截 back 与 send，其余交给父类。
         * @param {string} [action] 动作名
         * @returns {OO.ui.Process} 动作流程
         */
        getActionProcess(action) {
            if (action === "back") {
                return new OO.ui.Process(() => {
                    this.close({ action: "back" });
                }, this);
            }
            if (action !== "send") {
                return super.getActionProcess(action);
            }
            return new OO.ui.Process(
                async () => {
                    const params = this.sendParams;
                    if (this.sending || !params) {
                        return;
                    }
                    this.setSending(true);
                    try {
                        for (;;) {
                            const result = await sendEdit(params);
                            if (result.ok) {
                                // 锚点必须在关框前回读：用户看到的是连续的「发送中…」，而不是框已关闭却在干等
                                const anchor = await fetchLastSectionAnchor(result.newrevid);
                                // 对话框即将关闭，无需恢复按钮状态
                                this.close({ action: "sent", anchor });
                                return;
                            }
                            if (await confirmRetry(wgULS("发送失败", "傳送失敗"), result.detail) !== "retry") {
                                this.setSending(false);
                                return;
                            }
                        }
                    } catch (error) {
                        // 步骤内绝不能抛：一旦 reject，OOUI 会显示它内置的英文错误界面
                        this.setSending(false);
                        showError(wgULS("发送失败", "傳送失敗"), toErrorMessage(error));
                    }
                },
                this,
            );
        }

        /**
         * 内容区最大高度，超出则滚动。
         * @returns {number} 高度（px）
         */
        getBodyHeight() {
            return Math.min(super.getBodyHeight(), MAX_PREVIEW_BODY_HEIGHT);
        }

        /**
         * 发送中禁用两个按钮并改文案，防止重复投递。
         * @param {boolean} sending 是否正在发送
         */
        setSending(sending) {
            this.sending = sending;
            this.getActions().setAbilities({ send: !sending, back: !sending });
            this.getActions()
                .get({ actions: "send" })[0]
                ?.setLabel(sending ? wgULS("发送中…", "傳送中…") : wgULS("发送提醒", "傳送提醒"));
        }
    }

    const { wgNamespaceNumber, wgCanonicalSpecialPageName, wgRelevantUserName } = mw.config.get();

    if (
        !ALLOWED_NAMESPACES.includes(wgNamespaceNumber)
        || wgNamespaceNumber === -1 && !ALLOWED_SPECIAL_PAGES.includes(wgCanonicalSpecialPageName || "")
        || !wgRelevantUserName
    ) {
        return;
    }

    const configPromise = prefetchConfig();

    /**
     * 拼出配置加载失败的原因说明。
     * @param {string} reason 具体原因
     * @returns {string} 完整说明
     */
    const describeConfigFailure = (reason) => wgULS(`${CONFIG_PAGE} 读取或解析失败：${reason}`, `${CONFIG_PAGE} 讀取或解析失敗：${reason}`);

    /**
     * 在主对话框之上叠开预览对话框；主对话框保持开启。
     * 「返回」（或按 Esc）仅关掉预览，主对话框原样回到前台；
     * 发送成功则一并关掉主对话框，提示 REDIRECT_DELAY 后再跳到新章节。
     * @param {object} data 预览数据
     * @param {MainDialog} mainDialog 主对话框实例
     */
    const openPreview = (data, mainDialog) => {
        openWindow(new PreviewDialog({ size: DIALOG_SIZE }), data, (result) => {
            if (result?.action === "sent") {
                mainDialog.close();
                mw.notify(wgULS("发送成功，3 秒后跳转", "傳送成功，3 秒後跳轉"), { type: "success" });
                // 提示先露个脸，再离场：这一步是刻意延迟的，故此刻页面还能看见通知
                window.setTimeout(() => gotoNewSection(data.targetUser, result.anchor ?? ""), REDIRECT_DELAY);
            }
        });
    };

    /** 打开主对话框。 */
    const openDialog = () => {
        const settledConfig = getSettledConfig();
        if (settledConfig && !settledConfig.ok) {
            showError(wgULS("无法加载模板列表", "無法載入模板列表"), describeConfigFailure(settledConfig.message));
            return;
        }

        const mainDialog = new MainDialog({ size: DIALOG_SIZE });
        const data = {
            targetUser: wgRelevantUserName,
            configPromise,
            onPreview: (previewData) => openPreview(previewData, mainDialog),
        };
        openWindow(mainDialog, data, (result) => {
            if (result?.action === "configError") {
                showError(wgULS("无法加载模板列表", "無法載入模板列表"), describeConfigFailure(result.message));
                return;
            }
            if (result?.action === "formError") {
                showError(wgULS("界面构建失败", "介面建構失敗"), wgULS(`无法生成表单：${result.message}`, `無法產生表單：${result.message}`));
            }
        });
    };

    // 定义完处理函数再挂入口，避免监听器里出现前向引用
    const portletLink = mw.util.addPortletLink(
        "p-cactions",
        "#",
        wgULS("向用户发送提醒", "向使用者傳送提醒"),
        "p-usermessages",
        wgULS("向该用户发送提醒模板", "向該使用者傳送提醒模板"),
    );
    portletLink?.querySelector("a")?.addEventListener("click", (event) => {
        event.preventDefault();
        void openDialog();
    });
})();
