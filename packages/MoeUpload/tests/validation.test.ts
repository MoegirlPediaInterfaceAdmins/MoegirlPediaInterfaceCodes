import { describe, expect, it } from "vitest";
import { findMetaViolation, parseFieldEntries } from "@/logic/validation";
import { DEFAULT_CONFIG } from "../src/config/defaults";
import type { FieldSchema } from "../src/types";

const fields: FieldSchema[] = [
    { id: "work", label: "作品名或人物名", type: "tags", requiredGroup: "subject" },
    { id: "author", label: "作者", type: "tags", requiredGroup: "subject" },
    { id: "source", label: "来源", type: "text" },
    { id: "note", label: "备注", type: "text", required: true },
];

describe("findMetaViolation", () => {
    it("组内有一项非空即通过", () => {
        expect(findMetaViolation({ work: "影之诗WB", note: "x" }, fields)).toBeNull();
        expect(findMetaViolation({ author: "某人", note: "x" }, fields)).toBeNull();
    });

    it("组内全空返回 group 缺失", () => {
        const violation = findMetaViolation({ source: "官方", note: "x" }, fields);
        expect(violation).toEqual({
            kind: "group",
            labels: ["作品名或人物名", "作者"],
        });
    });

    it("单字段 required 为空返回 field 缺失（优先于组校验）", () => {
        const violation = findMetaViolation({ work: "影之诗WB" }, fields);
        expect(violation).toEqual({ kind: "field", labels: ["备注"] });
    });

    it("纯空白或纯分隔符的 tags 值视为未填写", () => {
        expect(findMetaViolation({ work: "  ", note: "x" }, fields)?.kind).toBe("group");
        expect(findMetaViolation({ work: "，、；", note: "x" }, fields)?.kind).toBe("group");
    });

    it("默认配置：元数据全空时命中作品名/作者组", () => {
        expect(findMetaViolation({}, DEFAULT_CONFIG.fields)).toEqual({
            kind: "group",
            labels: ["作品名或人物名", "作者"],
        });
    });
});

describe("parseFieldEntries", () => {
    it("tags 字段按混合分隔符拆分并剔除空项", () => {
        const field = fields[0];
        expect(parseFieldEntries(field, "A、B，C;D , E")).toEqual(["A", "B", "C", "D", "E"]);
        expect(parseFieldEntries(field, "、、")).toEqual([]);
        expect(parseFieldEntries(field, undefined)).toEqual([]);
    });

    it("单值字段不拆分，仅去首尾空白", () => {
        const field = fields[2];
        expect(parseFieldEntries(field, " 官方，自行截取 ")).toEqual(["官方，自行截取"]);
        expect(parseFieldEntries(field, "   ")).toEqual([]);
    });
});
