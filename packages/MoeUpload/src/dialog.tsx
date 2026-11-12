/** 主站上传弹窗：ProcessDialog 包 App，上传经跨站 API 打到共享站；三个入口任一失败不影响其余。 */
import { confirm, ProcessDialog, registerMessages } from "ooui-react";
import zhHansMessages from "ooui-react/locales/zh-hans";
import React, { StrictMode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { setUploadTarget } from "@/api/client";
import { App } from "@/components/App";
import { DEFAULT_CONFIG } from "@/config/defaults";
import { COMMONS_API_URL } from "@/config/sites";
import { t } from "@/locale";

const CONTAINER_ID = "moeupload-dialog-root";

/** MoeSkin 上传按钮图标：必须带 .tabler-icon 标记并按 HTML 字符串传给 hook，否则退回 inline SVG 基线排版 */
const UPLOAD_ICON_SVG
    = '<svg class="tabler-icon tabler-icon-upload" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 9l5 -5l5 5"/><path d="M12 4l0 12"/></svg>';

interface MoeSkinPageToolsPayload {
    addPageToolsButton: (
        icon: string | Element,
        title: string,
        type?: string,
    ) => { on: (event: string, handler: () => void) => unknown };
}

// 高度回写：只观察内容根节点（写回不改它，不会自触发），按 head + 内容 + foot + 边框写 frame；满屏形态跳过
const useFrameFit = (ref: { current: HTMLDivElement | null }): void => {
    useLayoutEffect(() => {
        const root = ref.current;
        const frame = root?.closest<HTMLElement>(".oo-ui-window-frame");
        if (!root || !frame) {
            return;
        }
        // frame 是 border-box，写进 height 的 px 要自己把上下边框加回去
        const style = getComputedStyle(frame);
        const border
            = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);

        const apply = (): void => {
            const manager = frame.closest(".oo-ui-windowManager");
            if (manager?.classList.contains("oo-ui-windowManager-size-full")) {
                return;
            }
            const head = frame.querySelector<HTMLElement>(".oo-ui-window-head");
            const foot = frame.querySelector<HTMLElement>(".oo-ui-window-foot");
            const total
                = (head?.offsetHeight ?? 0) + root.offsetHeight + (foot?.offsetHeight ?? 0) + border;
            frame.style.height = `${total}px`;
        };

        apply();
        const observer = new ResizeObserver(apply);
        observer.observe(root);
        return () => { observer.disconnect(); };
    }, [ref]);
};

// 浮层压住窗框：按窗框实际 z-index +1 写 --mu-float-z（未设层值兜底 21），_dialog.scss 覆盖组件写死的 4
const useFloatLayer = (ref: { current: HTMLDivElement | null }): void => {
    useLayoutEffect(() => {
        const manager = ref.current?.closest<HTMLElement>(".oo-ui-windowManager");
        const dialog = manager?.querySelector<HTMLElement>(":scope > .oo-ui-dialog");
        if (!manager || !dialog) {
            return;
        }
        const measured = Number.parseInt(getComputedStyle(dialog).zIndex, 10);
        manager.style.setProperty(
            "--mu-float-z",
            String(Number.isFinite(measured) ? measured + 1 : 21),
        );
    }, [ref]);
};

const DialogContent = ({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    useFrameFit(rootRef);
    useFloatLayer(rootRef);
    return (
        <div ref={rootRef}>
            <App config={DEFAULT_CONFIG} variant="dialog" onBusyChange={onBusyChange} />
        </div>
    );
};

let externalSetOpen: ((open: boolean) => void) | null = null;

const UploadDialog = ({ initialOpen = false }: { initialOpen?: boolean }) => {
    const [open, setOpen] = useState(initialOpen);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        externalSetOpen = setOpen;
        return () => {
            externalSetOpen = null;
        };
    }, []);

    const requestClose = async (): Promise<void> => {
        if (busy) {
            const ok = await confirm(t("dialog.busyConfirm"), { title: t("dialog.title") });
            if (!ok) {
                return;
            }
        }
        setOpen(false);
    };

    return (
        <ProcessDialog
            open={open}
            // 尺寸不由 size 决定：larger 只用于管理器类名与满屏断点，宽高由 _dialog.scss 与 useFrameFit 接管
            size="larger"
            className="moeupload-dialog"
            title={t("dialog.title")}
            escapable
            onEscape={() => void requestClose()}
            actions={[{ action: "close", label: t("dialog.close"), flags: ["safe", "close"] }]}
            onAction={(action) => {
                // 不返回 promise：关闭流程里的确认弹窗不应触发头部 pending 条纹
                if (action === "close") {
                    void requestClose();
                }
            }}
        >
            {open ? <DialogContent onBusyChange={setBusy} /> : null}
        </ProcessDialog>
    );
};

/** 打开上传弹窗：注册跨站上传目标并懒挂载容器；重复调用幂等（已挂载则只置 open） */
const openUploadDialog = (): void => {
    registerMessages(zhHansMessages);
    setUploadTarget({ kind: "foreign", apiUrl: COMMONS_API_URL });

    // 色板宿主：弹窗 DOM portal 到 body 直属的 windowManager，--mu-* 必须挂 body 才能沿继承链覆盖
    document.body.classList.add("moeupload-dialog-active");

    if (!document.getElementById(CONTAINER_ID)) {
        const container = document.createElement("div");
        container.id = CONTAINER_ID;
        document.body.appendChild(container);
        createRoot(container).render(
            <StrictMode>
                <UploadDialog initialOpen />
            </StrictMode>,
        );
        return;
    }
    externalSetOpen?.(true);
};

// 入口注册幂等：标记挂 documentElement（双重加载时模块级变量不共享），重复注册会产生双回调
const initDialogTrigger = (): void => {
    const root = document.documentElement;
    if (root.dataset.moeuploadDialog === "1") {
        return;
    }
    root.dataset.moeuploadDialog = "1";

    registerMessages(zhHansMessages);

    mw.hook("moeupload.open").add(() => { openUploadDialog(); });

    try {
        const link = mw.util.addPortletLink(
            "p-tb",
            "#",
            t("dialog.trigger"),
            "t-moeupload",
            t("dialog.triggerDesc"),
        );
        link?.addEventListener("click", (event) => {
            event.preventDefault();
            openUploadDialog();
        });
    } catch {
    }

    mw.hook<[payload: MoeSkinPageToolsPayload]>("moeskin.pagetools").add((payload) => {
        try {
            const button = payload.addPageToolsButton(
                UPLOAD_ICON_SVG,
                t("dialog.trigger"),
                "extra",
            );
            button.on("click", () => { openUploadDialog(); });
        } catch {
        }
    });
};

export { initDialogTrigger };
