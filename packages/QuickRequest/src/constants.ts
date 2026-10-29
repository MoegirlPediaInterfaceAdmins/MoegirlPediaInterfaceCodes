import type { SiteId } from "./types.ts";

/** 修改请求类型配置请到对应 JSON 文件进行，参数说明参见 README */
const CONFIG_PAGE = "MediaWiki:Gadget-QuickRequest.json";

/** 各部署站点的 origin：跨站 ForeignApi 与发帖成功后的跳转基址共用。 */
const SITE_ORIGINS: Record<SiteId, string> = {
    zh: "https://mzh.moegirl.org.cn",
    commons: "https://commons.moegirl.org.cn",
};

/** 讨论版各级版面的页名前缀（操作申请/权限变更等）；删除请求入口在这些页面自身不出现。 */
const BOARD_PREFIX = "萌娘百科_talk:讨论版";

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

/**
 * 反破坏举报申请（vandalReport）的发帖版面。模板 doc 标注「目前是」——版面可能迁移，
 * 实际目标以配置页的 targetPage 优先（见 TypeConfig），此值仅作配置缺省时的回退。
 */
const VANDAL_BOARD = "萌娘百科_talk:长期破坏者";

/** 用户查核记录页与其讨论页；新增查核记录发到讨论页（记录页自身受 patrolleredit 保护）。 */
const CHECKUSER_RECORD_PAGE = "萌娘百科:用户查核记录";
const CHECKUSER_RECORD_TALK = "萌娘百科_talk:用户查核记录";

/** 转换表页面的页面名形态；此类页面的编辑请求使用 editConversiontable 类型。 */
const CONVERSION_TABLE_PATTERN = /^MediaWiki:Conversiontable\/zh-[a-z]+$/;

/**
 * 方针 / 指引页面所属分类，编辑请求的方针修改提醒据此判断（比旧实现按讨论页命名空间的近似判断更准确）。
 * 取 mw.config 的 wgCategories 里的裸分类名（不带 Category: 前缀）；两个方针分类页均未挂
 * __HIDDENCAT__，成员必为可见分类、必会出现在 wgCategories 中。
 */
const POLICY_CATEGORIES = ["萌娘百科方针", "萌娘百科指引"];

/** 方针修改提醒的跳过名单，沿用 editRequestWarning 的既有名单。 */
const WARNING_SKIP_GROUPS = ["patroller", "sysop", "techeditor", "interface-admin", "staff"];

/**
 * 章节标题的用户与日期后缀。
 * 「 - <用户名> - <YYYY.MM.DD>」是各版面既有的话题标题格式，日期经 libPrefixNumber 补零，
 * 沿袭自 Gadget-edit / Gadget-requestDeletion 等旧实现（pageInfo 那份重复实现已随本包移除）；
 * 格式变化会影响版面存档与机器人流程。
 * @param userName 用户名
 * @param now 取哪一刻的时间
 * @returns ` - <用户名> - <YYYY.MM.DD>` 后缀
 */
const titleSuffix = (userName: string, now: Date): string => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;

export {
    BOARD_PREFIX,
    CHANGE_TAG,
    CHECKUSER_RECORD_PAGE,
    CHECKUSER_RECORD_TALK,
    CONFIG_PAGE,
    CONVERSION_TABLE_PATTERN,
    DIALOG_SIZE,
    MAX_MAIN_BODY_HEIGHT,
    MAX_PREVIEW_BODY_HEIGHT,
    OPERATIONS_BOARD,
    POLICY_CATEGORIES,
    REDIRECT_DELAY,
    RIGHTS_BOARD,
    SITE_ORIGINS,
    VANDAL_BOARD,
    WARNING_SKIP_GROUPS,
    titleSuffix,
};
