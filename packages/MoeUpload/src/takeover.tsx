import { registerMessages } from "ooui-react";
import zhHansMessages from "ooui-react/locales/zh-hans";
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/App";
import { DEFAULT_CONFIG } from "@/config/defaults";

const ROOT_ID = "moeupload-root";

/** 内容区容器候选，按可靠性降级尝试；全部落空时放弃接管并打日志（不退化成 prepend 到 body） */
const CONTAINER_SELECTORS = ["#mw-content-text", ".mw-body-content", "#content", ".mw-body"];

/** 容器探测的轮询次数与间隔：部分皮肤的内容区可能晚于本脚本到位 */
const CONTAINER_POLL_TIMES = 20;
const CONTAINER_POLL_INTERVAL = 100;

/** 挂载后二次校正隐藏的延时（皮肤可能在接管后补入节点） */
const REHIDE_DELAY = 300;

const findContainer = (): HTMLElement | null => {
    for (const selector of CONTAINER_SELECTORS) {
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
            return element;
        }
    }
    return null;
};

const waitForContainer = async (): Promise<HTMLElement | null> => {
    for (let attempt = 0; attempt < CONTAINER_POLL_TIMES; attempt++) {
        const container = findContainer();
        if (container) {
            return container;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, CONTAINER_POLL_INTERVAL);
        });
    }
    return null;
};

const hideNativeContent = (container: HTMLElement): void => {
    for (const node of Array.from(container.children)) {
        if (node.id !== ROOT_ID) {
            (node as HTMLElement).style.display = "none";
        }
    }
};

const mountApp = (container: HTMLElement): void => {
    document.body.classList.add("moeupload-active");

    const root = document.createElement("div");
    root.id = ROOT_ID;
    container.prepend(root);
    hideNativeContent(container);
    setTimeout(() => { hideNativeContent(container); }, REHIDE_DELAY);

    createRoot(root).render(
        <StrictMode>
            <App config={DEFAULT_CONFIG} />
        </StrictMode>,
    );
};

/** 接管 Special:Upload：隐藏原生表单、注入挂载点并渲染 React 应用；重复加载直接跳过（幂等） */
const initTakeover = (): void => {
    if (document.getElementById(ROOT_ID)) {
        return;
    }
    if (mw.config.get("wgCanonicalSpecialPageName", "") !== "Upload") {
        return;
    }

    registerMessages(zhHansMessages);

    const container = findContainer();
    if (container) {
        mountApp(container);
        return;
    }

    void waitForContainer()
        .then((late) => {
            if (document.getElementById(ROOT_ID)) {
                return;
            }
            if (late) {
                mountApp(late);
            } else {
                console.warn(
                    `[MoeUpload] content container not found (${CONTAINER_SELECTORS.join(" / ")}); takeover skipped`,
                );
            }
        })
        .catch((error: unknown) => {
            console.warn("[MoeUpload] content container lookup failed; takeover skipped", error);
        });
};

export { initTakeover };
