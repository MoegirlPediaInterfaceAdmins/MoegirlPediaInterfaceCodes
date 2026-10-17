/* eslint-disable @typescript-eslint/no-misused-promises -- ready 回调里的 async 函数不会被 await，其返回的 Promise 与 ready 的语义无关。 */
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initConfigStore } from "./config";
import JSONViewer from "./JSONViewer";
import { pageSource, parseDiffParam } from "./source";
import "./index.css";

// 安装 window 配置的响应式访问器（见 ./config），使配置读取不受脚本加载顺序影响
initConfigStore();

/** 渲染 JSON 树并返回容器；容器 id 同时是 index.css 的选择器依据 */
const mountViewer = (json: object): HTMLDivElement => {
    const container = document.createElement("div");
    container.id = "bearbintools-jsonviewer";
    createRoot(container).render(
        <StrictMode>
            <JSONViewer json={json} />
        </StrictMode>,
    );
    return container;
};

$(() => (async () => {
    if (mw.config.get("wgAction") !== "view") {
        return;
    }
    // mediawiki.api 在正式环境由界面库 definition.yaml 的 dependencies 声明，ResourceLoader 会在小工具执行前加载它。
    // 仅 dev 构建需要自行加载，这样 dist/dev 产物可以脱离依赖声明、在 safemode 下单独调试。
    if (__DEV__) {
        await mw.loader.using("mediawiki.api");
    }

    const contentModel = mw.config.get("wgPageContentModel");
    const jsonElement = document.getElementsByClassName("mw-json")[0] as Element | undefined;
    const contentText = document.getElementById("mw-content-text");

    try {
        if (contentModel === "json" && jsonElement) {
            const diff = parseDiffParam(window.location.search);
            const source = await pageSource(
                mw.config.get("wgPageName"),
                diff
                    ? {
                        rvstartid: diff,
                        rvendid: diff,
                    }
                    : undefined,
            );
            if (source === undefined) {
                return;
            }
            // 解析成功后才替换页面元素，内容无效时保留原本的可读内容
            jsonElement.replaceWith(mountViewer(JSON.parse(source) as object));
        } else if (contentModel === "text" && contentText && mw.config.get("wgTitle").includes("json")) {
            // 标题含 json 的纯文本页面是站内早先存放 JSON 的方式，这类页面没有 json 内容模型，只能按标题识别
            contentText.replaceChildren(mountViewer(JSON.parse(contentText.textContent) as object));
        }
    } catch (error) {
        console.error("JSONViewer: 页面内容不是有效的 JSON", error);
    }
})());
