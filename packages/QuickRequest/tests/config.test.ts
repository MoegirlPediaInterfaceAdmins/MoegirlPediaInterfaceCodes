import { describe, expect, it } from "vitest";
import { findTypeConfig, isGroupSatisfied, parseConfig } from "../src/config.ts";

const rawConfig = JSON.stringify({
    types: {
        edit: {
            template: "Template:编辑请求",
            requireAnyOf: ["original", "new"],
            parameters: [
                { key: "original", label: "旧内容", type: "multiline" },
                { key: "new", label: "新内容", type: "multiline" },
                { key: "reason", label: "修改原因", type: "text" },
            ],
        },
        move: {
            template: "Template:移动请求",
            parameters: [
                { key: "original", label: "移动前标题", type: "text", required: true, auto: "currentPage" },
                { key: "new", label: "移动后标题", type: "page", required: true },
            ],
        },
    },
});

describe("parseConfig", () => {
    it("解析合法配置并保留各类型条目", () => {
        const result = parseConfig(rawConfig);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.edit.template).toBe("Template:编辑请求");
            expect(result.config.types.edit.requireAnyOf).toEqual(["original", "new"]);
            expect(result.config.types.move.parameters?.[0]).toMatchObject({ key: "original", auto: "currentPage" });
        }
    });

    it("空内容、非法 JSON、缺 types 均判为失败", () => {
        expect(parseConfig("").ok).toBe(false);
        expect(parseConfig("not json").ok).toBe(false);
        expect(parseConfig("{}").ok).toBe(false);
        expect(parseConfig('{"types":[]}').ok).toBe(false);
    });

    it("非法参数定义被静默丢弃，其余参数保留", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                edit: {
                    template: "Template:编辑请求",
                    parameters: [
                        { key: "original", label: "旧内容" },
                        { key: "", label: "没有键" },
                        { label: "没有键的键名" },
                        "not-an-object",
                    ],
                },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.edit.parameters).toHaveLength(1);
        }
    });

    it("缺 template 的类型条目整条丢弃；全部非法时判为失败", () => {
        const partial = parseConfig(JSON.stringify({
            types: {
                edit: { template: "Template:编辑请求", parameters: [] },
                broken: { parameters: [{ key: "x", label: "y" }] },
            },
        }));
        expect(partial.ok).toBe(true);
        if (partial.ok) {
            expect(partial.config.types.broken).toBeUndefined();
        }
        expect(parseConfig(JSON.stringify({ types: { broken: {} } })).ok).toBe(false);
    });

    it("requireAnyOf 只保留真实存在的参数键，全不存在时丢弃该约束", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                edit: {
                    template: "Template:编辑请求",
                    requireAnyOf: ["original", "ghost"],
                    parameters: [{ key: "original", label: "旧内容" }, { key: "new", label: "新内容" }],
                },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.edit.requireAnyOf).toEqual(["original"]);
        }
        const dropped = parseConfig(JSON.stringify({
            types: {
                edit: {
                    template: "Template:编辑请求",
                    requireAnyOf: ["ghost"],
                    parameters: [{ key: "original", label: "旧内容" }],
                },
            },
        }));
        expect(dropped.ok).toBe(true);
        if (dropped.ok) {
            expect(dropped.config.types.edit.requireAnyOf).toBeUndefined();
        }
    });

    it("auto 只接受 currentPage，其它取值被丢弃", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                edit: {
                    template: "Template:编辑请求",
                    parameters: [
                        { key: "a", label: "甲", auto: "currentPage" },
                        { key: "b", label: "乙", auto: "somewhere" },
                    ],
                },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.edit.parameters?.[0].auto).toBe("currentPage");
            expect(result.config.types.edit.parameters?.[1].auto).toBeUndefined();
        }
    });
});

describe("parseConfig 覆盖合并（window.QuickRequest.types 的语义）", () => {
    it("同 id 覆盖预置条目，新 id 追加", () => {
        const result = parseConfig(rawConfig, {
            edit: { template: "Template:编辑请求/自定义", parameters: [] },
            extra: { template: "Template:额外", parameters: [] },
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.edit.template).toBe("Template:编辑请求/自定义");
            expect(result.config.types.extra.template).toBe("Template:额外");
            expect(result.config.types.move.template).toBe("Template:移动请求");
        }
    });

    it("覆盖条目本身非法时被丢弃，保留预置条目", () => {
        const result = parseConfig(rawConfig, { edit: { parameters: [{ key: "x", label: "y" }] } });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.edit.template).toBe("Template:编辑请求");
        }
    });
});

describe("isGroupSatisfied", () => {
    it("无约束时恒为真", () => {
        expect(isGroupSatisfied({ template: "T" }, {})).toBe(true);
    });

    it("组内任一键非空即满足", () => {
        const typeConfig = { template: "T", requireAnyOf: ["original", "new"], parameters: [] };
        expect(isGroupSatisfied(typeConfig, { original: "", "new": "内容" })).toBe(true);
        expect(isGroupSatisfied(typeConfig, { original: "  ", "new": "内容" })).toBe(true);
    });

    it("组内全部为空时不满足", () => {
        const typeConfig = { template: "T", requireAnyOf: ["original", "new"], parameters: [] };
        expect(isGroupSatisfied(typeConfig, { original: "", "new": "" })).toBe(false);
        expect(isGroupSatisfied(typeConfig, {})).toBe(false);
    });
});

describe("findTypeConfig", () => {
    it("按 id 取条目，不存在时为 undefined", () => {
        const result = parseConfig(rawConfig);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(findTypeConfig(result.config, "move")?.template).toBe("Template:移动请求");
            expect(findTypeConfig(result.config, "editTech")).toBeUndefined();
        }
    });
});
