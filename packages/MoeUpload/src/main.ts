import "./styles/app.scss";
import { COMMONS_HOSTS, DIALOG_HOSTS } from "./config/sites";
import { initDialogTrigger } from "./dialog";
import { initTakeover } from "./takeover";

const currentHost = (): string => mw.config.get("wgServerName", "") || window.location.hostname;

// 按宿主分流：共享站上传页走接管，主站注册弹窗入口；初始化异常只记录日志
const boot = (): void => {
    try {
        const host = currentHost();
        if (
            mw.config.get("wgCanonicalSpecialPageName", "") === "Upload"
            && COMMONS_HOSTS.has(host)
        ) {
            // 共享站上传页：页面接管
            initTakeover();
            return;
        }
        if (DIALOG_HOSTS.has(host)) {
            // 主站：注册弹窗触发入口（含 zh 的 Special:Upload——v1 不接管该页，维持原生表单）
            initDialogTrigger();
        }
    } catch (error) {
        console.error("[MoeUpload] init failed", error);
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}
