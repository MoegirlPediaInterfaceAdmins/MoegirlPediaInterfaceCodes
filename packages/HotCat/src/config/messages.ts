interface HotCatMessages {
    cat_removed: string;
    template_removed: string;
    cat_added: string;
    cat_keychange: string;
    cat_notFound: string;
    cat_exists: string;
    cat_resolved: string;
    separator: string;
    prefix: string;
    using: string;
    multi_change: string | string[];
    commit: string;
    ok: string;
    cancel: string;
    multi_error: string;
    short_catchange: string | null;
}

interface HotCatLinks {
    change: string;
    remove: string;
    add: string;
    restore: string;
    undo: string;
    down: string;
    up: string;
}

interface HotCatTooltips {
    change: string;
    remove: string;
    add: string;
    restore: string;
    undo: string;
    down: string;
    up: string;
}

export type { HotCatMessages, HotCatLinks, HotCatTooltips };
