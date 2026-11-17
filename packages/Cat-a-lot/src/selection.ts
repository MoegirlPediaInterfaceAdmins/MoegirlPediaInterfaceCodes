import {
    CLASS_DONE,
    CLASS_LABEL,
    CLASS_LAST,
    CLASS_SELECTED,
    FILE_ONLY_SPECIALS,
} from "./constants.ts";

interface PageContext {
    namespaceNumber: number;
    canonicalSpecialPageName: string | false;
}

const readPageContext = (): PageContext => ({
    namespaceNumber: mw.config.get("wgNamespaceNumber"),
    canonicalSpecialPageName: mw.config.get("wgCanonicalSpecialPageName"),
});

const collectTargetLinks = (allowNonFiles: boolean): JQuery => {
    const { namespaceNumber, canonicalSpecialPageName } = readPageContext();
    const isFileOnlySpecial = namespaceNumber === -1
        && canonicalSpecialPageName !== false
        && FILE_ONLY_SPECIALS.has(canonicalSpecialPageName);
    const selectors: string[] = [];

    if (namespaceNumber === 14) {
        selectors.push("#mw-category-media .gallerybox .gallerytext > a:first-child");
        if (allowNonFiles) {
            selectors.push(
                "#mw-pages .mw-category li > a:first-child",
                "#mw-pages .mw-category li > .redirect-in-category > a:first-child",
                "#mw-subcategories .CategoryTreeItem > a:first-of-type",
            );
        }
    } else {
        selectors.push("#mw-content-text .gallerybox .gallerytext > a:first-child");
        if (isFileOnlySpecial) {
            selectors.push(
                ".mw-spcontent ol.special li > a:first-child",
                ".TablePager td.TablePager_col_img_name > a:first-child",
            );
        } else if (allowNonFiles) {
            selectors.push(
                ".mw-search-results .mw-search-result-heading > a:first-child",
                ".mw-spcontent ol.special li > a:first-child",
                ".mw-prefixindex-list li > a:first-child",
                ".mw-prefixindex-list li > .allpagesredirect > a:first-child",
            );
        }
    }

    const seenTitles = new Set<string>();
    const links: HTMLElement[] = [];
    $(selectors.join(", ")).each((_, element) => {
        const $link = $(element);
        const href = $link.attr("href") ?? "";
        if (
            !href
            || href.startsWith("#")
            || $link.hasClass("external")
            || $link.hasClass("new")
            || /[?&](?:action|diff|oldid|redlink)=/iu.test(href)
        ) {
            return;
        }
        const rawTitle = ($link.attr("title") ?? "").trim() || $link.text().trim();
        if (!rawTitle) {
            return;
        }
        try {
            const parsed = mw.Title.newFromText(rawTitle);
            if (!parsed || parsed.getNamespaceId() < 0) {
                return;
            }
            if ((isFileOnlySpecial || !allowNonFiles) && parsed.getNamespaceId() !== 6) {
                return;
            }
            const prefixed = parsed.getPrefixedText();
            if (seenTitles.has(prefixed)) {
                return;
            }
            seenTitles.add(prefixed);
            $link.attr("data-cal-title", prefixed).addClass(CLASS_LABEL);
            links.push(element);
        } catch {
        }
    });
    return $(links);
};

interface PageItemBinding {
    allowNonFiles: boolean;
    isBusy(): boolean;
    onSelectionChange(): void;
}

let lastClickedElement: HTMLElement | null = null;

// 重绑前清掉旧状态，避免偏好切换后残留选中/完成标记。
const bindPageItems = (binding: PageItemBinding): number => {
    $(`.${CLASS_LABEL}`)
        .off("click.catALot")
        .removeClass(`${CLASS_LABEL} ${CLASS_SELECTED} ${CLASS_LAST} ${CLASS_DONE}`)
        .removeAttr("data-cal-title");
    lastClickedElement = null;

    const $links = collectTargetLinks(binding.allowNonFiles);
    $links.on("click.catALot", (event) => {
        if (binding.isBusy()) {
            event.preventDefault();
            return;
        }
        if (event.ctrlKey || event.metaKey) {
            return;
        }
        event.preventDefault();
        const currentElement = event.currentTarget;
        const $current = $(currentElement);

        $links.removeClass(CLASS_LAST);
        $current.addClass(CLASS_LAST).toggleClass(CLASS_SELECTED);

        if (lastClickedElement && event.shiftKey) {
            const previousIndex = $links.index(lastClickedElement);
            const currentIndex = $links.index(currentElement);
            if (previousIndex !== -1 && currentIndex !== -1) {
                const shouldSelect = $current.hasClass(CLASS_SELECTED);
                const $range = $links.slice(
                    Math.min(previousIndex, currentIndex),
                    Math.max(previousIndex, currentIndex) + 1,
                );
                $range[shouldSelect ? "addClass" : "removeClass"](CLASS_SELECTED);
            }
        }
        lastClickedElement = currentElement;
        binding.onSelectionChange();
    });
    binding.onSelectionChange();
    return $links.length;
};

const syncSelectedTitles = (): string[] => {
    const titles: string[] = [];
    $(`.${CLASS_SELECTED}`).each((_, element) => {
        const title = $(element).attr("data-cal-title");
        if (title && !titles.includes(title)) {
            titles.push(title);
        }
    });
    return titles;
};

const toggleAll = (select: boolean): string[] => {
    const $labels = $(`.${CLASS_LABEL}`);
    if (select) {
        $labels.addClass(CLASS_SELECTED);
    } else {
        $labels.removeClass(`${CLASS_SELECTED} ${CLASS_LAST}`);
        lastClickedElement = null;
    }
    return syncSelectedTitles();
};

const clearSelection = (): void => {
    $(`.${CLASS_LABEL}`).removeClass(`${CLASS_SELECTED} ${CLASS_LAST}`);
    lastClickedElement = null;
};

const markPageDone = (title: string): void => {
    $(`.${CLASS_LABEL}`)
        .filter((_, element) => $(element).attr("data-cal-title") === title)
        .removeClass(`${CLASS_SELECTED} ${CLASS_LAST}`)
        .addClass(CLASS_DONE);
};

export type { PageItemBinding };
export {
    collectTargetLinks,
    bindPageItems,
    syncSelectedTitles,
    toggleAll,
    clearSelection,
    markPageDone,
};
