// <pre>
"use strict";
$(() => {
    // 确保DOM加载完成后再执行
    /* TODO: 贡献页面 mw-contributions-user-tools 显示昵称并提供复制功能 */
    // 检查是否在日志页面或页面历史页面
    if (
        mw.config.get("wgAction") === "History"
        || mw.config.get("wgCanonicalNamespace") === "Special"
    ) {
        // 查找所有mw-userlink元素并更新其文本内容
        $(".mw-userlink").each(function () {
            const $this = $(this);
            const dataUserName = $this.attr("data-user-name");
            const dataUserNick = $this.attr("data-user-nick");

            // 检查是否存在 data-user-name 或 data-user-nick 属性
            if (dataUserName || dataUserNick && dataUserNick !== "") {
                // 构建新的显示文本：data-user-name | data-user-nick
                // 如果某个属性不存在或为空，则不显示它及对应的分隔符
                let newText = "";
                if (dataUserName) {
                    newText += dataUserName;
                }
                if (dataUserNick) {
                    if (newText) { // 如果前面已经添加了 data-user-name，先加一个分隔符
                        newText += " | ";
                    }
                    newText += dataUserNick;
                }

                // 如果构建的新文本为空（理论上不应该发生，因为上面检查过），则跳过
                if (!newText) {
                    return;
                }

                // 保留元素的所有子元素（如徽章等）
                const children = $this.contents().filter(function () {
                    // 保留不是文本节点的元素（如moe-badges等）
                    return this.nodeType !== 3;
                });

                // 更新文本内容为 "data-user-name | data-user-nick"
                $this.text(newText);

                // 重新附加之前的子元素（徽章等）
                $this.append(children);

                // --- 复制功能开关 ---
                /* TODO: 可以考虑控制显示复制按钮的特殊页面，比如监视列表不显示等等 */
                if (+mw.user.options.get("gadget-displayname-copy", 0) === 1) {
                    const buttonsToAppend = [];

                    // 按钮1: 仅复制 data-user-name (用户名)
                    if (dataUserName) { // 只有当 data-user-name 存在时才创建此按钮
                        const copyNameOnlyButton = $("<span>", {
                            text: "👤", // 用户名图标
                            style: "margin-left: 2px; cursor: pointer; font-size: 0.9em;",
                            title: `复制用户名: ${dataUserName}`,
                            click: async (e) => {
                                e.stopPropagation(); // 防止点击事件冒泡到链接
                                try {
                                    await navigator.clipboard.writeText(dataUserName);
                                    alert(`用户名 "${dataUserName}" 已复制到剪贴板！`);
                                } catch (err) {
                                    console.error("复制用户名失败:", err);
                                    // 降级方案
                                    const textArea = document.createElement("textarea");
                                    textArea.value = dataUserName;
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try {
                                        document.execCommand("copy");
                                        alert(`用户名 "${dataUserName}" 已复制到剪贴板！(降级方案)`);
                                    } catch (err2) {
                                        console.error("降级复制也失败:", err2);
                                        alert(`复制失败，请手动选择文字: ${dataUserName}`);
                                    }
                                    document.body.removeChild(textArea);
                                }
                            },
                        });
                        buttonsToAppend.push(copyNameOnlyButton);
                    }

                    // 按钮2: 仅复制 data-user-nick (昵称)
                    if (dataUserNick) { // 只有当 data-user-nick 存在时才创建此按钮
                        const copyNickOnlyButton = $("<span>", {
                            text: "🏷️", // 标签/昵称图标
                            style: "margin-left: 2px; cursor: pointer; font-size: 0.9em;",
                            title: `复制昵称: ${dataUserNick}`,
                            click: async (e) => {
                                e.stopPropagation(); // 防止点击事件冒泡到链接
                                try {
                                    await navigator.clipboard.writeText(dataUserNick);
                                    alert(`昵称 "${dataUserNick}" 已复制到剪贴板！`);
                                } catch (err) {
                                    console.error("复制昵称失败:", err);
                                    // 降级方案
                                    const textArea = document.createElement("textarea");
                                    textArea.value = dataUserNick;
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try {
                                        document.execCommand("copy");
                                        alert(`昵称 "${dataUserNick}" 已复制到剪贴板！(降级方案)`);
                                    } catch (err2) {
                                        console.error("降级复制也失败:", err2);
                                        alert(`复制失败，请手动选择文字: ${dataUserNick}`);
                                    }
                                    document.body.removeChild(textArea);
                                }
                            },
                        });
                        buttonsToAppend.push(copyNickOnlyButton);
                    }

                    // 将所有存在的按钮一次性添加到链接后面
                    if (buttonsToAppend.length > 0) {
                        $this.after(buttonsToAppend);
                    }
                }
                // --- 复制功能开关结束 ---
            }
        });
    }
})();
// </pre>
