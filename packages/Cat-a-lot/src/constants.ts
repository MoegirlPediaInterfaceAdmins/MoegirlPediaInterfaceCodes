const CAT_A_LOT_CHANGE_TAG = "Cat-a-lot";
const BOT_CHANGE_TAG = "Bot";

// 普通用户只带 Cat-a-lot；bot/flood 用户组带 Cat-a-lot|Bot。
const activeChangeTags = (hasBotRight: boolean): string => hasBotRight
    ? `${CAT_A_LOT_CHANGE_TAG}|${BOT_CHANGE_TAG}`
    : CAT_A_LOT_CHANGE_TAG;

const PREFS_STORAGE_KEY = "ext.gadget.Cat-a-lot-prefs";
const HEIGHT_STORAGE_KEY = "ext.gadget.Cat-a-lot-height";

const NON_BOT_MAX_PAGES = 50;
const NON_BOT_DELAY_MS = 20_000;
const SYSOP_FLOOD_PROMPT_THRESHOLD = 10;
const API_TIMEOUT_MS = 30_000;

const MIN_PANEL_HEIGHT = 260;
const MAX_PANEL_HEIGHT = 760;
const DEFAULT_PANEL_HEIGHT = 440;

const CLASS_LABEL = "gadget-cat_a_lot-label";
const CLASS_SELECTED = "gadget-cat_a_lot-label--selected";
const CLASS_LAST = "gadget-cat_a_lot-label--last-selected";
const CLASS_DONE = "gadget-cat_a_lot-label--done";

const SUPPORTED_SPECIALS = new Set([
    "Search",
    "Listfiles",
    "Uncategorizedfiles",
    "Uncategorizedpages",
    "Unusedfiles",
    "Mostlinkedcategories",
    "Prefixindex",
]);

const FILE_ONLY_SPECIALS = new Set([
    "Listfiles",
    "Uncategorizedfiles",
    "Unusedfiles",
]);

export {
    CAT_A_LOT_CHANGE_TAG,
    BOT_CHANGE_TAG,
    activeChangeTags,
    PREFS_STORAGE_KEY,
    HEIGHT_STORAGE_KEY,
    NON_BOT_MAX_PAGES,
    NON_BOT_DELAY_MS,
    SYSOP_FLOOD_PROMPT_THRESHOLD,
    API_TIMEOUT_MS,
    MIN_PANEL_HEIGHT,
    MAX_PANEL_HEIGHT,
    DEFAULT_PANEL_HEIGHT,
    CLASS_LABEL,
    CLASS_SELECTED,
    CLASS_LAST,
    CLASS_DONE,
    SUPPORTED_SPECIALS,
    FILE_ONLY_SPECIALS,
};
