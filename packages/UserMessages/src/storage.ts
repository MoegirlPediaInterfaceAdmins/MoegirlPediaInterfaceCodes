import { STORAGE_KEY } from "./constants.ts";

/** 需要跨会话记住的状态。 */
interface PersistedState {
    /** 上次选中的模板 title */
    templateTitle: string;
    /** 上次的编辑摘要 */
    editSummary: string;
}

/** 兜底状态。 */
const DEFAULT_STATE: PersistedState = { templateTitle: "", editSummary: "" };

/**
 * 读取本地状态。逐字段校验类型，任何非法值都回落到默认值。
 * @returns 本地状态
 */
const loadPersisted = (): PersistedState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_STATE };
        }
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return {
            templateTitle: typeof parsed.templateTitle === "string" ? parsed.templateTitle : "",
            editSummary: typeof parsed.editSummary === "string" ? parsed.editSummary : "",
        };
    } catch (error) {
        console.warn("[UserMessages] 读取本地状态失败，使用默认值", error);
        return { ...DEFAULT_STATE };
    }
};

/**
 * 合并写入本地状态。写入失败（如隐私模式）静默忽略，不影响主流程。
 * @param patch 需要更新的字段
 */
const savePersisted = (patch: Partial<PersistedState>): void => {
    try {
        const current = loadPersisted();
        const next = { ...current, ...patch };
        // 值没变就不写：代码里的 setValue 同样会触发 change，没必要重复落盘
        if (next.templateTitle === current.templateTitle && next.editSummary === current.editSummary) {
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
        console.warn("[UserMessages] 写入本地状态失败", error);
    }
};

export { type PersistedState, loadPersisted, savePersisted };
