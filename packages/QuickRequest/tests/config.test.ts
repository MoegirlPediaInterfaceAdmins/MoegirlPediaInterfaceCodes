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

    it("readOnly 只接受布尔值，hint 只接受非空字符串，非法取值丢弃", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                banAppeal: {
                    template: "Template:BlockedUserHelp/request",
                    parameters: [
                        { key: "1", label: "封禁信息", type: "multiline", readOnly: true },
                        { key: "reason", label: "求助理由", hint: "提示文字" },
                        { key: "bad1", label: "甲", readOnly: "yes" },
                        { key: "bad2", label: "乙", hint: "  " },
                    ],
                },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            const params = result.config.types.banAppeal.parameters ?? [];
            expect(params[0]?.readOnly).toBe(true);
            expect(params[1]?.hint).toBe("提示文字");
            expect(params[2]?.readOnly).toBeUndefined();
            expect(params[3]?.hint).toBeUndefined();
        }
    });

    it("hidden 只接受布尔值（隐藏字段不渲染，值仍自动带出）", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                move: {
                    template: "Template:移动请求",
                    parameters: [
                        { key: "original", label: "移动前标题", auto: "currentPage", readOnly: true, hidden: true },
                        { key: "new", label: "移动后标题", hidden: "yes" },
                    ],
                },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.move.parameters?.[0].hidden).toBe(true);
            expect(result.config.types.move.parameters?.[1].hidden).toBeUndefined();
        }
    });

    it("targetPage 只接受非空字符串（配置级目标页，vandalReport 的版面用）", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                vandalReport: {
                    template: "Template:编辑请求/反破坏举报申请",
                    targetPage: "萌娘百科_talk:长期破坏者",
                    parameters: [{ key: "1", label: "被举报者用户名", type: "user" }],
                },
                move: {
                    template: "Template:移动请求",
                    targetPage: "  ",
                },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.vandalReport.targetPage).toBe("萌娘百科_talk:长期破坏者");
            expect(result.config.types.move.targetPage).toBeUndefined();
        }
    });

    it("targetPage 不替代 template/variants 的存在性要求", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                orphan: { targetPage: "萌娘百科_talk:长期破坏者" },
            },
        }));
        // 唯一条目因无 template/variants 被丢弃，类型列表为空 → 判为失败
        expect(result.ok).toBe(false);
    });
});

describe("parseConfig 变体（variants）", () => {
    const variantConfig = JSON.stringify({
        types: {
            userGroup: {
                variants: [
                    {
                        id: "patroller",
                        label: "维护姬申请",
                        template: "Template:权限申请/维护姬申请",
                        parameters: [{ key: "1", label: "申请理由", type: "multiline", required: true }],
                    },
                    {
                        id: "checkuser",
                        label: "用户查核员申请",
                        template: "Template:权限申请/查核监督申请",
                        fixedParams: { 用户组: "用户查核员", 时长: 12 },
                        requireAnyOf: ["1", "ghost"],
                        parameters: [{ key: "1", label: "申请理由", type: "multiline", required: true }],
                    },
                    { id: "patroller", label: "重复 id", template: "T" },
                    { id: "broken", label: "缺模板", parameters: [] },
                    "not-an-object",
                ],
            },
        },
    });

    it("合法变体保留，非法变体丢弃；类型级 template 可省略", () => {
        const result = parseConfig(variantConfig);
        expect(result.ok).toBe(true);
        if (result.ok) {
            const variants = result.config.types.userGroup.variants;
            expect(variants).toHaveLength(2);
            expect(variants?.[0]).toMatchObject({ id: "patroller", template: "Template:权限申请/维护姬申请" });
        }
    });

    it("重复 id 的变体只保留首个", () => {
        const result = parseConfig(variantConfig);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.userGroup.variants?.every((variant, index, all) =>
                all.findIndex((other) => other.id === variant.id) === index)).toBe(true);
        }
    });

    it("变体的 fixedParams 只保留字符串值，requireAnyOf 按变体自身参数过滤", () => {
        const result = parseConfig(variantConfig);
        expect(result.ok).toBe(true);
        if (result.ok) {
            const checkuser = result.config.types.userGroup.variants?.[1];
            expect(checkuser?.fixedParams).toEqual({ 用户组: "用户查核员" });
            expect(checkuser?.requireAnyOf).toEqual(["1"]);
        }
    });

    it("类型级 template 与 variants 并存时两者都保留", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                userGroup: {
                    template: "Template:兜底",
                    variants: [{ id: "x", label: "某申请", template: "T" }],
                },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.userGroup.template).toBe("Template:兜底");
            expect(result.config.types.userGroup.variants).toHaveLength(1);
        }
    });

    it("变体全非法且无类型级 template 时整条丢弃", () => {
        const result = parseConfig(JSON.stringify({
            types: {
                edit: { template: "Template:编辑请求", parameters: [] },
                userGroup: { variants: [{ id: "x", label: "缺模板" }] },
            },
        }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.config.types.userGroup).toBeUndefined();
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
