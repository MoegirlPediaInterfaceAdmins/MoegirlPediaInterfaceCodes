import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults";
import { makeItem, queueReducer, rawNameFromUrl, takenNames } from "../src/state/queue";
import type { QueueItem } from "../src/types";

const CONFIG = DEFAULT_CONFIG;

const stubFile = (name: string, size = 100): File =>
    new File(["x".repeat(size)], name, { type: "text/plain" });

const addItem = (state: { items: QueueItem[] }, name: string): { items: QueueItem[] } => {
    const taken = takenNames(state.items);
    const item = makeItem({
        id: `id-${name}`,
        kind: "file",
        file: stubFile(name),
        rawName: name,
        config: CONFIG,
        takenNames: taken,
    });
    return queueReducer(state, { type: "add", items: [item] });
};

describe("makeItem", () => {
    it("同批重名文件自动追加序号", () => {
        const taken = new Set<string>();
        const first = makeItem({
            id: "a",
            kind: "file",
            file: stubFile("same.png"),
            rawName: "same.png",
            config: CONFIG,
            takenNames: taken,
        });
        const second = makeItem({
            id: "b",
            kind: "file",
            file: stubFile("same.png"),
            rawName: "same.png",
            config: CONFIG,
            takenNames: taken,
        });
        // 首字母大写由 sanitizeFilename 完成，与服务端对 NS_FILE 的 ucfirst 一致
        expect(first.name).toBe("Same.png");
        expect(second.name).toBe("Same (2).png");
    });

    it("默认元数据来自字段 schema，许可取默认项", () => {
        const item = makeItem({
            id: "a",
            kind: "file",
            file: stubFile("x.png"),
            rawName: "x.png",
            config: CONFIG,
            takenNames: new Set(),
        });
        expect(item.meta).toEqual({ work: "", author: "", source: "", description: "" });
        expect(item.licenseId).toBe("Copyright");
    });
});

describe("queueReducer", () => {
    it("patch 只更新目标条目", () => {
        let state = { items: [] as QueueItem[] };
        state = addItem(state, "a.png");
        state = addItem(state, "b.png");
        state = queueReducer(state, { type: "patch", id: "id-a.png", patch: { status: "staged" } });
        expect(state.items[0].status).toBe("staged");
        expect(state.items[1].status).toBe("pending");
    });

    it("applyToAll 复制元数据到所有未完成条目", () => {
        let state = { items: [] as QueueItem[] };
        state = addItem(state, "a.png");
        state = addItem(state, "b.png");
        state = queueReducer(state, {
            type: "setMeta",
            id: "id-a.png",
            fieldId: "description",
            value: "统一描述",
        });
        state = queueReducer(state, {
            type: "patch",
            id: "id-a.png",
            patch: { categories: ["截图"] },
        });
        state = queueReducer(state, { type: "applyToAll", sourceId: "id-a.png" });
        expect(state.items[1].meta.description).toBe("统一描述");
        expect(state.items[1].categories).toEqual(["截图"]);
    });

    it("clearDone 只保留未完成条目", () => {
        let state = { items: [] as QueueItem[] };
        state = addItem(state, "a.png");
        state = addItem(state, "b.png");
        state = queueReducer(state, { type: "patch", id: "id-a.png", patch: { status: "done" } });
        state = queueReducer(state, { type: "clearDone" });
        expect(state.items.map((item) => item.name)).toEqual(["B.png"]);
    });

    it("queued（进入审核队列）视为终态，clearDone 一并清除", () => {
        let state = { items: [] as QueueItem[] };
        state = addItem(state, "a.png");
        state = addItem(state, "b.png");
        state = queueReducer(state, { type: "patch", id: "id-a.png", patch: { status: "queued" } });
        state = queueReducer(state, { type: "clearDone" });
        expect(state.items.map((item) => item.name)).toEqual(["B.png"]);
    });

    it("reupload 条目的文件名锁定，rename 被忽略", () => {
        let state = { items: [] as QueueItem[] };
        state = addItem(state, "a.png");
        state = queueReducer(state, { type: "patch", id: "id-a.png", patch: { reupload: true } });
        state = queueReducer(state, { type: "rename", id: "id-a.png", name: "改名字.png" });
        expect(state.items[0].name).toBe("A.png");
    });

    it("rawName 清洗为空时回退「未命名文件」", () => {
        const item = makeItem({
            id: "a",
            kind: "url",
            url: "https://example.com/",
            rawName: "   ",
            config: CONFIG,
            takenNames: new Set(),
        });
        expect(item.name).toBe("未命名文件");
    });
});

describe("rawNameFromUrl", () => {
    it("取路径末段并解码", () => {
        expect(rawNameFromUrl("https://example.com/a/%E5%9B%BE%E7%89%87.png")).toBe("图片.png");
    });

    it("路径为空返回空串", () => {
        expect(rawNameFromUrl("https://example.com/")).toBe("");
    });

    it("非法 URL 返回空串", () => {
        expect(rawNameFromUrl("::::")).toBe("");
    });
});
