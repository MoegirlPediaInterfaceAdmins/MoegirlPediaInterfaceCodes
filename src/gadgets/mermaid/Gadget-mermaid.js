"use strict";
/**
 * 在页面中渲染 Mermaid 图表。
 *
 * 用法：在 Wiki 文本中使用 <code>&lt;pre class="mermaid"&gt;graph TD; A--&gt;B&lt;/pre&gt;</code>，
 * pre 标签内的内容不会被 wiki 解析器二次处理，适合承载 Mermaid 定义。
 * 仅当页面中存在 pre.mermaid 时才会从 CDN 加载 Mermaid 库（经 libCachedCode 缓存 30 天），
 * 无图表的页面零额外开销。
 */
(() => {
    // 锁定大版本号：libCachedCode 的 localStorage 缓存以 URL 为 key，升级时必须显式变更此 URL 才会生效
    const MERMAID_LIB_URL = "https://testingcf.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    const CONTAINER_SELECTOR = "pre.mermaid";

    // 库的加载与初始化只执行一次
    let mermaidLoading;
    const loadMermaid = () => {
        if (mermaidLoading) {
            return mermaidLoading;
        }
        mermaidLoading = (async () => {
            // dist/mermaid.min.js 是自包含的 IIFE 构建，挂载到 globalThis.mermaid；
            // 不能使用 mermaid.esm.min.mjs，libCachedCode 的 Blob URL 注入不支持 ES module
            await libCachedCode.injectCachedCode(MERMAID_LIB_URL, "script");
            window.mermaid.initialize({
                startOnLoad: false,
                // 图表定义来自任意编辑者，开放 wiki 必须使用 strict 模式：
                // 禁用 HTML 标签与点击回调，防止通过图表定义注入代码
                securityLevel: "strict",
            });
            return window.mermaid;
        })();
        // 加载/初始化失败时清空缓存中的 Promise，让后续触发（如预览）可以重试瞬时网络/CDN 故障；
        // 在赋值完成后的 Promise 回调里清理，避免与赋值本身产生时序竞争
        // eslint-disable-next-line promise/prefer-await-to-then -- 这是 fire-and-forget 的清理回调，不是可用 await 替代的控制流
        mermaidLoading.catch(() => {
            mermaidLoading = undefined;
        });
        return mermaidLoading;
    };

    const render = async ($content) => {
        const containers = $content.find(CONTAINER_SELECTOR).toArray()
            .filter((ele) => !ele.dataset.mermaidStatus);
        if (containers.length === 0) {
            return;
        }
        // 同步标记，防止初始扫描与 wikipage.content 钩子（以及预览多次触发）对同一容器重复渲染
        for (const ele of containers) {
            ele.dataset.mermaidStatus = "pending";
        }
        let mermaid;
        try {
            mermaid = await loadMermaid();
        } catch (e) {
            console.error("[Gadget-mermaid] Failed to load mermaid library", e);
            for (const ele of containers) {
                ele.dataset.mermaidStatus = "error";
            }
            return;
        }
        await Promise.all(containers.map((ele) => mermaid
            .render(`mermaid-gadget-${Math.random().toString(36).slice(2)}`, ele.textContent ?? "")
            .then(({ svg }) => {
                // strict 模式下 Mermaid 内部（DOMPurify）已对输出做净化；
                // 这里再经 DOMParser 解析为 SVG 文档后导入，导入的脚本节点按规范不可执行，作纵深防御
                const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
                ele.replaceChildren(document.importNode(doc.documentElement, true));
                ele.dataset.mermaidStatus = "done";
                return ele;
            })
            .catch((e) => {
                console.error("[Gadget-mermaid] Failed to render diagram", e);
                ele.dataset.mermaidStatus = "error";
                // 保留原始定义文本，使用 mw 内置错误消息样式在容器后追加错误提示
                const errorTip = document.createElement("div");
                errorTip.className = "mw-message-box mw-message-box-error";
                errorTip.setAttribute("role", "alert");
                errorTip.textContent = wgULS("Mermaid 图表渲染失败，请检查图表定义语法。", "Mermaid 圖表渲染失敗，請檢查圖表定義語法。");
                ele.after(errorTip);
            })));
    };

    document.querySelectorAll(".mw-parser-output").forEach((content) => render($(content)));
    mw.hook("wikipage.content").add(render);
})();
