/** 修改请求类型配置请到对应 JSON 文件进行，参数说明参见 README */
const CONFIG_PAGE = "MediaWiki:Gadget-QuickRequest.json";

/** 对话框尺寸。 */
const DIALOG_SIZE: OO.ui.Window.Size = "large";

/** 主对话框内容区最大高度（px），超出则滚动。 */
const MAX_MAIN_BODY_HEIGHT = 520;

/** 预览对话框内容区最大高度（px），超出则滚动。 */
const MAX_PREVIEW_BODY_HEIGHT = 560;

/** 提交成功后延迟跳转的时长（ms）。 */
const REDIRECT_DELAY = 3000;

/** 编辑标签，沿用 Automation tool 前缀；需在站内预先定义（部署前置事项）。 */
const CHANGE_TAG = "Automation tool|QuickRequest";

/** 移动 / 创建请求的发帖版面。 */
const OPERATIONS_BOARD = "萌娘百科_talk:讨论版/操作申请";

/** 用户组申请/提名（userGroup）的发帖版面。 */
const RIGHTS_BOARD = "萌娘百科_talk:讨论版/权限变更";

/** 转换表页面的页面名形态；此类页面的编辑请求使用 editConversiontable 类型。 */
const CONVERSION_TABLE_PATTERN = /^MediaWiki:Conversiontable\/zh-[a-z]+$/;

/** 方针 / 指引页面所属分类，编辑请求的方针修改提醒据此判断（比旧实现按讨论页命名空间的近似判断更准确）。 */
const POLICY_CATEGORIES = ["Category:萌娘百科方针", "Category:萌娘百科指引"];

/** 方针修改提醒的跳过名单，沿用 editRequestWarning 的既有名单。 */
const WARNING_SKIP_GROUPS = ["patroller", "sysop", "techeditor", "interface-admin", "staff"];

/**
 * 章节标题的用户与日期后缀。
 * 日期补零与 Gadget-edit / Gadget-pageInfo / Gadget-requestDeletion 的现状一致（libPrefixNumber），
 * 格式变化会影响版面存档与机器人流程。
 * @param userName 用户名
 * @param now 取哪一刻的时间
 * @returns ` - <用户名> - <YYYY.MM.DD>` 后缀
 */
const titleSuffix = (userName: string, now: Date): string => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;

export {
    CHANGE_TAG,
    CONFIG_PAGE,
    CONVERSION_TABLE_PATTERN,
    DIALOG_SIZE,
    MAX_MAIN_BODY_HEIGHT,
    MAX_PREVIEW_BODY_HEIGHT,
    OPERATIONS_BOARD,
    POLICY_CATEGORIES,
    REDIRECT_DELAY,
    RIGHTS_BOARD,
    WARNING_SKIP_GROUPS,
    titleSuffix,
};
