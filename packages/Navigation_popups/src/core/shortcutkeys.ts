// 快捷键域：popupShortcutKeys 开启时接管 document.onkeypress（Esc 关闭弹窗、
// popupkey 字母循环聚焦），addPopupShortcut 为导航链接注入 popupkey 属性与
// title 后缀。行为基准 = legacy shortcutkeys.ts（commit 02c8dec）。
// 快捷键特性整体建立在 legacy keypress/keyCode/window.event API 上，属刻意
// 保留的旧式面。
/* eslint-disable @typescript-eslint/no-deprecated -- keypress/keyCode/which/window.event 是本特性的上游契约面 */
import { killPopup, eventsState } from "./events.ts";
import { getValueOf } from "./options.ts";
import { popupString } from "./strings.ts";

type PopupHandleKeypress = NonNullable<GlobalEventHandlers["onkeypress"]> & { lastPopupLinkSelected?: Element | null };

const popupHandleKeypress: PopupHandleKeypress = (evt) => {
    const keyCode = window.event ? (window.event as KeyboardEvent).keyCode : evt.keyCode ? evt.keyCode : evt.which;
    const link = eventsState.current.link;
    if (!keyCode || !link?.navpopup) {
        return;
    }
    if (keyCode === 27) {
        // Esc：关闭当前弹窗并吞掉按键
        Reflect.apply(killPopup, link, []);
        return false;
    }
    const letter = String.fromCharCode(keyCode);
    const links = link.navpopup.mainDiv.getElementsByTagName("A");
    let startLink = 0;
    let i: number, j: number;
    if (popupHandleKeypress.lastPopupLinkSelected) {
        for (i = 0; i < links.length; ++i) {
            if (links[i] === popupHandleKeypress.lastPopupLinkSelected) {
                startLink = i;
            }
        }
    }
    for (j = 0; j < links.length; ++j) {
        i = (startLink + j + 1) % links.length;
        if (links[i].getAttribute("popupkey") === letter) {
            evt.preventDefault();
            // jQuery trigger("focus") 走原生 focus 路径（上游 links[i].focus()
            // 的等价面；legacy 移植版误写成裸 el.trigger，见重写版语义笔记）
            $(links[i]).trigger("focus");
            popupHandleKeypress.lastPopupLinkSelected = links[i];
            return false;
        }
    }
    // 无匹配：把按键交还旧 handler
    if (document.oldPopupOnkeypress) {
        return document.oldPopupOnkeypress(evt) as boolean | undefined;
    }
    return true;
};

export const addPopupShortcuts = (): void => {
    if (document.onkeypress !== popupHandleKeypress) {
        document.oldPopupOnkeypress = document.onkeypress;
    }
    document.onkeypress = popupHandleKeypress;
};

export const rmPopupShortcuts = (): void => {
    popupHandleKeypress.lastPopupLinkSelected = null;
    try {
        if (document.oldPopupOnkeypress && document.oldPopupOnkeypress === popupHandleKeypress) {
            document.onkeypress = null;
            return;
        }
        document.onkeypress = document.oldPopupOnkeypress ?? null;
    } catch {
        // 旧浏览器的 onkeypress 赋值可能抛错（上游“半心半意”的保存/恢复原样）
    }
};

const addLinkProperty = (html: string, property: string): string => {
    const i = html.indexOf(">");
    if (i < 0) {
        return html;
    }
    return `${html.substring(0, i)} ${property}${html.substring(i)}`;
};

export const addPopupShortcut = (html: string | null, _key?: string | null): string | null => {
    let key = _key;
    if (!html || !getValueOf("popupShortcutKeys")) {
        return html;
    }
    const ret = addLinkProperty(html, `popupkey="${String(key)}"`);
    if (key === " ") {
        key = popupString("spacebar");
    }
    return ret.replace(/^(.*?)(title=")(.*?)(".*)$/i, `$1$2$3 [${String(key)}]$4`);
};
