/** 修改默认模板请到对应 JSON 文件进行，参数说明参见[[Help:UserMessages]] */
const CONFIG_PAGE = "MediaWiki:Gadget-UserMessages.json";

/** localStorage 键名。 */
const STORAGE_KEY = "usermessages-state";

/** 对话框尺寸。 */
const DIALOG_SIZE: OO.ui.Window.Size = "large";

/** 主对话框内容区最大高度（px），超出则滚动。 */
const MAX_MAIN_BODY_HEIGHT = 520;

/** 预览对话框内容区最大高度（px）。 */
const MAX_PREVIEW_BODY_HEIGHT = 560;

/** 发送成功后延迟跳转的时长（ms）。 */
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
 * @param user 用户名，不含命名空间前缀
 * @returns 讨论页标题
 */
const talkPageTitle = (user: string): string => `User talk:${user}`;

export {
    ALLOWED_NAMESPACES,
    ALLOWED_SPECIAL_PAGES,
    CONFIG_PAGE,
    DEFAULT_SIGNATURE_SUFFIX,
    DIALOG_SIZE,
    MAX_MAIN_BODY_HEIGHT,
    MAX_PREVIEW_BODY_HEIGHT,
    REDIRECT_DELAY,
    STORAGE_KEY,
    talkPageTitle,
};
