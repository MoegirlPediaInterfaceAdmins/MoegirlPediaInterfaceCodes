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

describe("阶段 5 类型的注册记录", () => {
    it("vandalReport：可见性对齐版面编辑保护（autoconfirmed），目标为长期破坏者版面，append 追加", () => {
        const definition = REQUEST_TYPES.vandalReport;
        if (definition === undefined) {
            throw new Error("vandalReport 类型未注册");
        }
        // 版面萌娘百科_talk:长期破坏者 的编辑保护即 autoconfirmed——能手动发帖的就能用表单；
        // 提请环节无用户组限制（反破坏方针限制的是 Abuse 的认定环节，不是提请）
        expect(definition.availability({ ...context, userGroups: ["autoconfirmed"] })).toBe(true);
        expect(definition.availability({ ...context, userGroups: [] })).toBe(false);
        // 模板 doc 标注版面「目前是」——配置页 targetPage 优先，此值为回退
        expect(definition.resolveTarget(context)).toBe("萌娘百科_talk:长期破坏者");
        // 模板正文以 ==提请将[[User:…]]列入破坏者列表== 开头，标题由模板生成
        expect(definition.postMode).toBe("append");
    });

    it("checkuserRecord：仅查核员可见，目标为记录页的讨论页，append 追加", () => {
        const definition = REQUEST_TYPES.checkuserRecord;
        if (definition === undefined) {
            throw new Error("checkuserRecord 类型未注册");
        }
        expect(definition.availability({ ...context, userGroups: ["checkuser"] })).toBe(true);
        expect(definition.availability({ ...context, userGroups: ["sysop"] })).toBe(false);
        // 记录页自身受 patrolleredit 保护，请求发到其讨论页（真实话题核实）
        expect(definition.resolveTarget(context)).toBe("萌娘百科_talk:用户查核记录");
        expect(definition.postMode).toBe("append");
    });

    it("editTech：恒可用，目标为本页讨论页，标题沿用「编辑请求 - 用户 - 日期」", () => {
        const definition = REQUEST_TYPES.editTech;
        if (definition === undefined) {
            throw new Error("editTech 类型未注册");
        }
        expect(definition.availability(context)).toBe(true);
        expect(definition.resolveTarget(context)).toBe("Example_talk");
        // 模板正文不带标题；真实用例（CSS 页讨论页）的章节标题与 edit 相同
        expect(definition.sectionTitle?.(context)).toBe("编辑请求 - Someone - 2026.10.29");
    });
});
