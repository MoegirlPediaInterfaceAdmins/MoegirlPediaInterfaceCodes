/**
 * Gadget-mboxCollapse
 * 自动折叠页面上的所有 mbox（萌娘百科叫 .infoBox）
 * 折叠态保留原有边框与背景，只显示小号图标 + 单行省略标题
 * 右上角 ＋/－ 按钮切换展开/折叠
 */
"use strict";
mw.util.addCSS(".infoBoxText { padding-right: 20px }");
mw.hook("wikipage.content").add(($out) => {
    const COLLAPSED_ICON_SIZE = 20;
    const $mboxes = $out.find(".infoBox");
    $mboxes.each(function () {
        const $box = $(this);
        if ($box.data("mbox-collapse-initialized")) {
            return;
        }
        $box.data("mbox-collapse-initialized", true);
        const $content = $box.find(".infoBoxContent").first();
        const $icon = $box.find(".infoBoxIcon").first();
        const $text = $box.find(".infoBoxText").first();
        if (!$content.length || !$text.length) {
            return;
        }
        // ── Extract title: first <b> text, or first line of text ──
        const $mboxTitle = $content.find(".infoBoxTitle").first();
        const $firstBold = $text.find("b").first();
        let titleText = $mboxTitle.length ? $mboxTitle.text() : $firstBold.length ? $firstBold.text() : $text.text().split("\n")[0];
        titleText = titleText.replace(/\s+/g, " ").trim();
        // ── Get border color as fallback for title color ──
        const borderColor = $box.css("border-left-color") || "";
        // ── Clone icon and shrink ──
        const $smallIcon = $icon.find("img").first().clone()
            .removeAttr("srcset")
            .attr({ width: COLLAPSED_ICON_SIZE, height: "" })
            .css({ width: `${COLLAPSED_ICON_SIZE}px`, height: "auto", display: "block" });
        // ── Collapsed summary row: wrap in .infoBoxContent to inherit CSS ──
        const $summary = $("<div>")
            .addClass("infoBoxContent mbox-collapse-summary")
            .css({ overflow: "hidden" });
        const $summaryInner = $("<div>").css({
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px",
            paddingRight: "28px", // space for toggle button
            minWidth: 0,
            overflow: "hidden",
        });
        $summaryInner.append(
            $("<span>").css({ flexShrink: 0, lineHeight: 0 }).append($smallIcon),
            $("<span>").css({
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "90%",
                fontWeight: "bold",
                color: $text.css("color") || borderColor || "inherit",
            }).text(titleText),
        );
        $summary.append($summaryInner);
        // ── ＋/－ toggle button ──
        const $btn = $("<a>")
            .addClass("mbox-collapse-toggle")
            .attr({ role: "button", tabindex: "0", "aria-expanded": "false", title: "展开/折叠" })
            .text("＋")
            .css({
                position: "absolute",
                top: "6px",
                right: "6px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "16px",
                lineHeight: 1,
                userSelect: "none",
                color: borderColor || "#555",
                opacity: 0.7,
                zIndex: 10,
            })
            .on("mouseenter", function () { $(this).css("opacity", 1); })
            .on("mouseleave", function () { $(this).css("opacity", 0.7); });
        // ── Positioning context ──
        if ($box.css("position") === "static") {
            $box.css("position", "relative");
        }
        $box.append($btn);
        $content.before($summary);
        // ── Initially collapsed ──
        $content.hide();
        let collapsed = true;
        $btn.on("click keydown", (e) => {
            if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") {
                return;
            }
            e.preventDefault();
            collapsed = !collapsed;
            $btn.attr("aria-expanded", String(!collapsed));
            if (collapsed) {
                $content.hide();
                $summary.show();
                $btn.text("＋");
            } else {
                $summary.hide();
                $content.show();
                $btn.text("－");
            }
        });
    });
});
