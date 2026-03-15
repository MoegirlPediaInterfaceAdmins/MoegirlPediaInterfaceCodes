"use strict";
$(() => {
    if (mw.config.get("wgNamespaceNumber") % 2 === 1 && mw.config.get("wgPageName") !== "萌娘百科_talk:讨论版") {
        const inHistory = !document.getElementsByClassName("mw-editsection")[0] || $(".mw-editsection").css("display") === "none";
        const buttonText = wgULS("固定链接", "固定連結");
        $("#mw-content-text .mw-parser-output h2").each((_, ele) => {
            const $ele = $(ele);
            const $editsection = $(ele).next(".mw-editsection");
            const $divider = $('<span class="mw-editsection-divider"> | </span>');
            const $permanentLink = $("<a>")
                .attr("data-thread-id", mw.util.escapeIdForLink($ele.attr("id")))
                .addClass("section-permanent-link")
                .text(buttonText);
            if (!inHistory) {
                $editsection
                    .find(".mw-editsection-bracket")
                    .first()
                    .after($divider)
                    .after($permanentLink);
                const $marButton = $editsection.find(".AnnTools_MarkAsResolved");
                if ($marButton[0]) {
                    const $marDivider = $marButton.next(".mw-editsection-divider");
                    if ($marDivider.length > 0) {
                        $marDivider.after($divider).after($permanentLink);
                    }
                }
            } else {
                const permanentLinkButton = $('<span class="mw-editsection" style="display:inline!important"></span>');
                permanentLinkButton.append(
                    '<span class="mw-editsection-bracket">[</span>',
                    $permanentLink,
                    '<span class="mw-editsection-bracket">]</span>',
                );
                $ele.find(".mw-headline").after(permanentLinkButton);
            }
            $permanentLink.on("click", () => {
                navigator.clipboard.writeText(`[[Special:PermanentLink/${mw.config.get("wgRevisionId")}#${$permanentLink.data("thread-id")}]]`);
                $permanentLink.text(wgULS("复制成功", "復製成功"));
                setTimeout(() => {
                    $permanentLink.text(buttonText);
                }, 2000);
            });
        });
    }
});
