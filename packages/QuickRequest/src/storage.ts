/**
 * 持久偏好（经 ext.gadget.LocalObjectStorage 落在浏览器 localStorage）。
 * 写入一律走 QuickRequest 自己的键；读取在新键从未写过时回退旧 requestDeletion 的键——
 * 迁移语义：不回写旧键，也不把旧值复制进新键（旧键数据保持原样）。
 * 实例惰性创建，模块求值不触碰 localStorage（与 api.ts 不在求值时构造 Api 实例同理）。
 */
let storage: LocalObjectStorage | null = null;

const getStorage = (): LocalObjectStorage => {
    storage ??= new LocalObjectStorage("AnnTools-QuickRequest");
    return storage;
};

/**
 * 读取持久偏好。
 * @param key 新存储键
 * @param legacy 旧存储回退（requestDeletion 迁移：新键未写过时读旧键）
 * @returns 偏好值（字符串形态）；两处都没有时为 null
 */
const getPreference = (key: string, legacy?: { name: string; key: string }): string | null => {
    const value = getStorage().getItem(key);
    if (typeof value === "string") {
        return value;
    }
    if (legacy !== undefined) {
        const legacyValue = new LocalObjectStorage(legacy.name).getItem(legacy.key);
        if (legacyValue !== null && legacyValue !== undefined) {
            // 旧键存的是任意 JSON 值（requestDeletion 的 enterToSubmit 是布尔），统一转字符串形态
            return typeof legacyValue === "string" ? legacyValue : JSON.stringify(legacyValue);
        }
    }
    return null;
};

/**
 * 写入持久偏好（QuickRequest 键）。
 * @param key 存储键
 * @param value 偏好值
 */
const setPreference = (key: string, value: string): void => {
    getStorage().setItem(key, value);
};

export { getPreference, setPreference };
