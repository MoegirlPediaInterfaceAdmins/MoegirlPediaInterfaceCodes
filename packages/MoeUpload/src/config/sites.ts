// 站点常量（内置唯一配置源，不对站点开放覆盖）：上传能力按宿主站分流

/** 共享站 api.php：主站弹窗模式的上传目标（跨站经 mw.ForeignApi 调用） */
export const COMMONS_API_URL = "https://commons.moegirl.org.cn/api.php";

/** 共享站宿主域名：这些站上 Special:Upload 走页面接管，上传直接打本站 API */
export const COMMONS_HOSTS = new Set(["commons.moegirl.org.cn"]);

/** 弹窗入口域名：这些站上注册弹窗触发入口，上传经跨站 API 打到共享站 */
export const DIALOG_HOSTS = new Set(["zh.moegirl.org.cn", "mzh.moegirl.org.cn"]);
