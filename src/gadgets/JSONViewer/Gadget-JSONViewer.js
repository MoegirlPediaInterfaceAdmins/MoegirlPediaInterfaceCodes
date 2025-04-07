"use strict";
$(() => (async () => {
    if (mw.config.get("wgAction") !== "view") {
        return;
    }

    // #region 加载依赖
    mw.loader.load("https://esm.sh/react18-json-view@0.2.9/src/style.css", "text/css");
    mw.loader.load("https://esm.sh/react18-json-view@0.2.9/src/dark.css", "text/css");
    const [React, { createRoot }, ReactJson] = await Promise.all([
        import("https://esm.sh/react@19.1.0"),
        import("https://esm.sh/react-dom@19.1.0/client"),
        import("https://esm.sh/react18-json-view@0.2.9"),
    ]);
    // #region 加载依赖

    const jsonElement = document.getElementsByClassName("mw-json")[0];
    /** 渲染容器 */
    const container = document.createElement("div");
    container.id = "bearbintools-jsonviewer";
    const root = createRoot(container);

    const useDarkTheme = () => document.body.classLzist.contains("theme-dark");

    /** 封装可视化组件 */
    const JSONViewer = ({ json }) => {
        /** 暗色模式 */
        const [dark, setDark] = React.useState(window.jsonViewerDark || useDarkTheme());

        React.useEffect(() => {
            if (mw.config.get("skin") !== "moeskin") {
                return;
            }
            /** 监视moeskin控制暗色模式的类产生变化 */
            const observer = new MutationObserver((mutations) => {
                mutations
                    .filter(({ attributeName }) => attributeName === "class")
                    .forEach(() => setDark(useDarkTheme()));
            });

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ["class"],
            });

            return () => observer.disconnect();
        }, []);

        return React.createElement(
            ReactJson.default,
            {
                src: json,
                displaySize: true,
                collapseStringMode: "word",
                collapseStringsAfterLength: 150,
                theme: window.jsonViewerTheme || "vscode",
                dark: dark,
            },
        );
    };

    if (jsonElement && mw.config.get("wgPageContentModel") === "json") {
        // 页面内容格式为JSON，获取JSON并渲染
        const urlParams = new URLSearchParams(window.location.search);
        const diff = urlParams.get("diff") ?? urlParams.get("oldid");
        const api = new mw.Api();
        const res = await api.post({
            action: "query",
            prop: "revisions",
            titles: mw.config.get("wgPageName"),
            rvprop: "content",
            ...diff
                ? {
                    rvstartid: +diff,
                    rvendid: +diff,
                }
                : {},
        });
        const json = Object.values(res.query.pages)[0].revisions[0]["*"];
        jsonElement.replaceWith(container);

        root.render(
            React.createElement(
                JSONViewer,
                {
                    json: JSON.parse(json),
                },
            ),
        );
    } else if (mw.config.get("wgPageContentModel") === "text" && mw.config.get("wgTitle").includes("json")) {
        // 页面内容格式为纯文本，尝试解析页面文本
        try {
            const json = JSON.parse(document.getElementById("mw-content-text").textContent);
            document.getElementById("mw-content-text").replaceChildren(container);
            root.render(
                React.createElement(
                    JSONViewer,
                    {
                        json,
                    },
                ),
            );
        } catch (e) {
            console.log(e);
        }
    }
})());
