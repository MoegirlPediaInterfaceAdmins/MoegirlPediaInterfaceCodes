/** moeskin 判定：惰性读取皮肤名，便于测试中桩掉 mw 全局 */
export const isMoeskin = (): boolean => mw.config.get("skin") === "moeskin";

/** 皮肤把暗色开关记录在哪个 html 属性上：moeskin 用 color-mode，其余皮肤用 class */
const darkModeAttribute = (): string => isMoeskin() ? "color-mode" : "class";

/**
 * 暗色主题探测。
 * moeskin 的选择写在 html 的 color-mode 属性上；vector-2022 等皮肤写在 `skin-theme-clientpref-*` 类上。
 * 后者的跟随系统一档（`-os`）由 `@media (prefers-color-scheme: dark)` 生效，类名本身不含暗色信息，
 * 因此需要另外查询操作系统的深浅色偏好。
 */
export const isDarkTheme = (): boolean => {
    if (isMoeskin()) {
        return document.documentElement.getAttribute("color-mode") === "dark";
    }
    const { classList } = document.documentElement;
    if (classList.contains("skin-theme-clientpref-night")) {
        return true;
    }
    return classList.contains("skin-theme-clientpref-os") && window.matchMedia("(prefers-color-scheme: dark)").matches;
};

/**
 * 订阅皮肤暗色状态的变化：html 上被监视的属性发生变化、或跟随系统一档下操作系统深浅色变化时调用回调。
 * 返回取消订阅函数。回调不携带参数，调用方重新调用 isDarkTheme 读取最新状态。
 */
export const subscribeSkinDark = (onStoreChange: () => void): () => void => {
    const observer = new MutationObserver(onStoreChange);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [darkModeAttribute()],
    });

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    prefersDark.addEventListener("change", onStoreChange);

    return () => {
        observer.disconnect();
        prefersDark.removeEventListener("change", onStoreChange);
    };
};
