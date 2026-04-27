// <pre>
"use strict";

(() => {
    if (!["Recentchanges", "Watchlist", "Recentchangeslinked", "Contributions"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        return;
    }
    if (!document.querySelector(".mw-rcfilters-ui-highlights-enhanced-toplevel")) {
        return;
    }

    const SELECTORS = {
        CONTAINER: ".mw-rcfilters-ui-highlights-enhanced-toplevel",
        EDIT_LINE_INNER: ".mw-rcfilters-ui-highlights-enhanced-toplevel.mw-changeslist-src-mw-edit .mw-changeslist-line-inner",
        NEW_LINE_INNER: ".mw-rcfilters-ui-highlights-enhanced-toplevel.mw-changeslist-src-mw-new .mw-changeslist-line-inner",
        LOG_LINE_INNER: ".mw-rcfilters-ui-highlights-enhanced-toplevel.mw-changeslist-src-mw-log .mw-changeslist-line-inner",
        STATUS_ICON: "i.mod-status-icon",
        LINKS_SPAN: "span.mw-changeslist-links",
    };

    const CLASSES = {
        COUNT_WRAPPER: "pc-mip-count-wrapper",
        COUNT_BADGE: "pc-mip-count",
    };

    const removeTrailingIcons = () => {
        const $editAndNewLinksSpans = $(`${SELECTORS.EDIT_LINE_INNER}, ${SELECTORS.NEW_LINE_INNER}`)
            .find(SELECTORS.LINKS_SPAN);

        $editAndNewLinksSpans.each(function () {
            const $thisSpan = $(this);
            const $icons = $thisSpan.find(SELECTORS.STATUS_ICON);

            $icons.each(function () {
                const prevNode = this.previousSibling;
                if (prevNode?.nodeType === Node.TEXT_NODE) {
                    prevNode.remove();
                }
                this.remove();
            });
        });

        const $logLinksSpansWithIcons = $(SELECTORS.LOG_LINE_INNER)
            .find(SELECTORS.LINKS_SPAN)
            .find(SELECTORS.STATUS_ICON)
            .closest(SELECTORS.LINKS_SPAN);

        $logLinksSpansWithIcons.remove();
    };

    const processChangesList = () => {
        const $containers = $(SELECTORS.CONTAINER);
        $(`.${CLASSES.COUNT_WRAPPER}`).remove();

        $containers.each(function () {
            const $currentRow = $(this);
            const $nextRows = $currentRow.nextUntil(SELECTORS.CONTAINER);
            const count = $nextRows.find(SELECTORS.STATUS_ICON).length;

            if (count > 0) {
                const $iconToClone = $nextRows.find(SELECTORS.STATUS_ICON).first().clone();
                const $counterBadge = $(`<span class="${CLASSES.COUNT_BADGE}">${count}</span>`);
                $iconToClone.append($counterBadge);
                const $wrapper = $(`<span class="${CLASSES.COUNT_WRAPPER}">`).append($iconToClone);
                $wrapper.css({
                    position: "relative",
                    display: "inline-block",
                    contain: "none",
                });
                $currentRow.find("td.mw-changeslist-line-inner").first().prepend($wrapper);
            }
        });
        removeTrailingIcons();
    };

    const throttle = (func, wait) => {
        let timeout;
        return (...args) => {
            const later = () => {
                clearTimeout(timeout);
                Reflect.apply(func, this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const throttledProcess = throttle(processChangesList, 300);

    $(document).ready(processChangesList);

    $(window).on("rcfilters-dynamic-updates-complete", throttledProcess);
    $(document).on("mw.cx.event.vc.rcupdates", throttledProcess);
})();
// </pre>
