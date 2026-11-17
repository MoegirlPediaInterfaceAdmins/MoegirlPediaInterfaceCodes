import {
    DEFAULT_PANEL_HEIGHT,
    HEIGHT_STORAGE_KEY,
    MAX_PANEL_HEIGHT,
    MIN_PANEL_HEIGHT,
    PREFS_STORAGE_KEY,
} from "./constants.ts";
import type { CatALotPrefs, DockPosition, WatchlistOption } from "./types.ts";

const DEFAULT_PREFS: CatALotPrefs = {
    watchlist: "preferences",
    minor: false,
    editpages: true,
    subcatcount: 50,
    position: "bottom-right",
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object"
    && value !== null
    && !Array.isArray(value);

const isWatchlistOption = (value: unknown): value is WatchlistOption => value === "preferences"
    || value === "nochange"
    || value === "watch"
    || value === "unwatch";

const isDockPosition = (value: unknown): value is DockPosition => value === "bottom-right"
    || value === "bottom-left";

const sanitizeSubcatCount = (value: unknown): number => {
    const numeric = typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
            ? +value
            : Number.NaN;
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 500) {
        return DEFAULT_PREFS.subcatcount;
    }
    return numeric;
};

const sanitizePrefs = (input: unknown): CatALotPrefs => {
    const record = isRecord(input) ? input : {};
    return {
        watchlist: isWatchlistOption(record.watchlist) ? record.watchlist : DEFAULT_PREFS.watchlist,
        minor: typeof record.minor === "boolean" ? record.minor : DEFAULT_PREFS.minor,
        editpages: typeof record.editpages === "boolean" ? record.editpages : DEFAULT_PREFS.editpages,
        subcatcount: sanitizeSubcatCount(record.subcatcount),
        position: isDockPosition(record.position) ? record.position : DEFAULT_PREFS.position,
    };
};

const readStoredPrefs = (): unknown => {
    try {
        const raw = mw.storage.get(PREFS_STORAGE_KEY);
        if (typeof raw !== "string" || raw.trim() === "") {
            return {};
        }
        return JSON.parse(raw) as unknown;
    } catch {
        return {};
    }
};

const loadPrefs = (): CatALotPrefs => {
    const stored = readStoredPrefs();
    const override: unknown = window.CatALotPrefs;
    const storedRecord = isRecord(stored) ? stored : {};
    const overrideRecord = isRecord(override) ? override : {};
    const merged: Record<string, unknown> = {
        ...DEFAULT_PREFS,
        ...storedRecord,
        ...overrideRecord,
    };
    return sanitizePrefs(merged);
};

const savePrefs = (prefs: CatALotPrefs): void => {
    try {
        mw.storage.set(PREFS_STORAGE_KEY, JSON.stringify(sanitizePrefs(prefs)));
    } catch {
    }
};

const clampHeight = (height: number): number => Math.min(Math.max(Math.round(height), MIN_PANEL_HEIGHT), MAX_PANEL_HEIGHT);

const loadPanelHeight = (): number => {
    try {
        const raw = mw.storage.get(HEIGHT_STORAGE_KEY);
        if (typeof raw !== "string" || raw.trim() === "") {
            return DEFAULT_PANEL_HEIGHT;
        }
        const parsed = +raw;
        return Number.isFinite(parsed) ? clampHeight(parsed) : DEFAULT_PANEL_HEIGHT;
    } catch {
        return DEFAULT_PANEL_HEIGHT;
    }
};

const savePanelHeight = (height: number): void => {
    try {
        const safeHeight = Number.isFinite(height) ? clampHeight(height) : DEFAULT_PANEL_HEIGHT;
        mw.storage.set(HEIGHT_STORAGE_KEY, `${safeHeight}`);
    } catch {
    }
};

export { DEFAULT_PREFS, sanitizePrefs, loadPrefs, savePrefs, loadPanelHeight, savePanelHeight };
