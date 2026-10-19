import { describe, expect, it } from "vitest";
import { checkCondition, checkConditions, getPropertyFromCamelCase } from "../../skip/conditions.js";

describe("getPropertyFromCamelCase", () => {
    it("按点路径取嵌套属性", () => {
        expect(getPropertyFromCamelCase({ commit: { author: { name: "Ann" } } }, "commit.author.name")).toBe("Ann");
    });

    it("单段路径直接取属性", () => {
        expect(getPropertyFromCamelCase({ type: "push" }, "type")).toBe("push");
    });

    it("点路径段可作为数组下标", () => {
        expect(getPropertyFromCamelCase({ list: ["a", "b"] }, "list.1")).toBe("b");
    });

    it("路径中途不存在时抛出 TypeError", () => {
        expect(() => getPropertyFromCamelCase({}, "a.b.c")).toThrow(TypeError);
    });
});

describe("checkCondition", () => {
    const head_commit = { type: "push" };

    it("equal 且值相等时满足", () => {
        expect(checkCondition(head_commit, { property: "type", operator: "equal", value: "push" })).toBe(true);
    });

    it("equal 且值不等时不满足", () => {
        expect(checkCondition(head_commit, { property: "type", operator: "equal", value: "cron" })).toBe(false);
    });

    it("startsWith 且为前缀时满足", () => {
        expect(checkCondition({ message: "feat: x" }, { property: "message", operator: "startsWith", value: "feat" })).toBe(true);
    });

    it("startsWith 且非前缀时不满足", () => {
        expect(checkCondition({ message: "fix: y" }, { property: "message", operator: "startsWith", value: "feat" })).toBe(false);
    });

    it("未知 operator 按不满足处理（fail-safe，CI 多跑好过漏跑）", () => {
        expect(checkCondition(head_commit, { property: "type", operator: "contains", value: "x" })).toBe(false);
    });
});

describe("checkConditions", () => {
    const equalPush = { property: "type", operator: "equal", value: "push" };
    const startsWithFeat = { property: "message", operator: "startsWith", value: "feat" };

    it("空条件列表视为满足", () => {
        expect(checkConditions({ type: "push" }, [])).toBe(true);
    });

    it("全部条件满足", () => {
        expect(checkConditions({ type: "push", message: "feat: x" }, [equalPush, startsWithFeat])).toBe(true);
    });

    it("任一条件不满足即不满足", () => {
        expect(checkConditions({ type: "cron", message: "feat: x" }, [equalPush, startsWithFeat])).toBe(false);
    });

    it("前置条件不满足时短路，不再评估后续条件", () => {
        // 第二个条件的属性路径不存在，一旦被评估会抛 TypeError；返回 false 即证明被短路
        expect(checkConditions({ type: "cron" }, [equalPush, { property: "missing.deep", operator: "equal", value: "x" }])).toBe(false);
    });
});
