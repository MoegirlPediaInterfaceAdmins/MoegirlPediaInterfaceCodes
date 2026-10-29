import { describe, expect, it } from "vitest";
import { REQUEST_TYPES } from "../src/registry.ts";
import type { QuickRequestContext } from "../src/types.ts";

const moveDefinition = REQUEST_TYPES.move;
if (moveDefinition === undefined) {
    throw new Error("move 类型未注册");
}

const context: QuickRequestContext = {
    pageName: "Example_page",
    talkPage: "Example_talk",
    userName: "Someone",
    userGroups: [],
    now: new Date(2026, 9, 29),
    isRedirect: false,
};

describe("move 类型的移动到自身校验", () => {
    it("新标题与当前页面名相同（含下划线/空格差异）时拦截", () => {
        expect(moveDefinition.validate).toBeTypeOf("function");
        expect(moveDefinition.validate?.({ original: "Example_page", "new": "Example_page", reason: "r" }, context)).not.toBe(null);
        expect(moveDefinition.validate?.({ original: "Example_page", "new": "Example page", reason: "r" }, context)).not.toBe(null);
    });

    it("仅首字母大小写不同视为同一页面，拦截", () => {
        expect(moveDefinition.validate?.({ original: "Example_page", "new": "example_page", reason: "r" }, context)).not.toBe(null);
    });

    it("新标题不同（含换命名空间）时放行", () => {
        expect(moveDefinition.validate?.({ original: "Example_page", "new": "Example page 2", reason: "r" }, context)).toBe(null);
        expect(moveDefinition.validate?.({ original: "Example_page", "new": "Help:Example page", reason: "r" }, context)).toBe(null);
    });
});
