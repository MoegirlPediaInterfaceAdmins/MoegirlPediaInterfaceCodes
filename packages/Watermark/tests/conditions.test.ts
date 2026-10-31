import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { decideScene, getNamespacePrefixRegex, hasVariantMatch, normalizeTitle, type PageContext, type WatermarkScene } from "../src/conditions.ts";

// 覆盖 User/User talk 的常用别名；键名与 wgNamespaceIds 一致使用下划线形式
const NAMESPACE_IDS: Record<string, number> = { user: 2, user_talk: 3, 用户: 2, 用户讨论: 3, draft: 118, draft_talk: 119 };

const baseContext: PageContext = {
    userGroups: ["*"],
    skin: "vector",
    action: "view",
    articleId: 1,
    namespaceNumber: 0,
    namespaceIds: NAMESPACE_IDS,
    pageName: "Foo",
    curRevisionId: 100,
    revisionId: 100,
};

/**
 * 构造仅覆盖指定字段的上下文。
 * @param overrides 相对 {@link baseContext} 的差异字段
 */
const context = (overrides: Partial<PageContext> = {}): PageContext => ({ ...baseContext, ...overrides });

describe("getNamespacePrefixRegex", () => {
    it("匹配该命名空间的全部别名（大小写不敏感、含本地化别名）", () => {
        const regex = getNamespacePrefixRegex(2, NAMESPACE_IDS);
        assert.match("User:Foo", regex);
        assert.match("user:Foo", regex);
        assert.match("USER:Foo", regex);
        assert.match("用户:Foo", regex);
        assert.doesNotMatch("User_talk:Foo", regex);
        assert.doesNotMatch("Foo", regex);
    });

    it("无别名命名空间产出空分支正则（恒不匹配）", () => {
        const regex = getNamespacePrefixRegex(9999, NAMESPACE_IDS);
        assert.doesNotMatch("User:Foo", regex);
    });
});

describe("normalizeTitle", () => {
    it("空格转下划线、剥前缀、去首尾空白", () => {
        const regex = getNamespacePrefixRegex(2, NAMESPACE_IDS);
        assert.equal(normalizeTitle("User:Foo Bar", regex), "Foo_Bar");
        // 首尾空格先于 trim 被替换为下划线，trim 无法再去掉（与迁移前 site-js 的归一化顺序一致）
        assert.equal(normalizeTitle("  Foo Bar  ", regex), "__Foo_Bar__");
        assert.equal(normalizeTitle("Foo Bar", regex), "Foo_Bar");
    });
});

describe("decideScene", () => {
    it("autoconfirmed 用户在所有场景下均不显示", () => {
        const ctx = context({ userGroups: ["*", "autoconfirmed"], namespaceNumber: 118, curRevisionId: 100, revisionId: 99 });
        assert.equal(decideScene(ctx, "任意标题"), null);
    });

    it("历史版本：wgCurRevisionId 与 wgRevisionId 均为正且不等", () => {
        assert.equal(decideScene(context({ curRevisionId: 100, revisionId: 99 }), "Foo"), "history-revision");
    });

    it("最新版本（两 id 相等）不触发历史版本水印", () => {
        assert.equal(decideScene(context({ curRevisionId: 100, revisionId: 100 }), "Foo"), null);
    });

    it("id 非正（如 0 / -1）不触发历史版本水印", () => {
        assert.equal(decideScene(context({ curRevisionId: 0, revisionId: 99 }), "Foo"), null);
        assert.equal(decideScene(context({ curRevisionId: 100, revisionId: -1 }), "Foo"), null);
    });

    it("历史版本优先于其余场景", () => {
        // 草稿页上的历史版本查看应命中历史版本文案
        assert.equal(decideScene(context({ namespaceNumber: 118, curRevisionId: 100, revisionId: 99 }), "Foo"), "history-revision");
    });

    it("用户页显示标题与页名不符 → 进入变体复核", () => {
        const ctx = context({ namespaceNumber: 2, pageName: "User:Example", articleId: 42 });
        assert.equal(decideScene(ctx, "Example被改写的标题"), "variant-check");
    });

    it("用户页显示标题归一化后与页名一致 → 不显示", () => {
        const ctx = context({ namespaceNumber: 2, pageName: "User:Example" });
        assert.equal(decideScene(ctx, "User:Example"), null);
        // 显示时空格、存储时下划线不算不符
        assert.equal(decideScene(ctx, "Example"), null);
    });

    it("用户页非 view 动作（如编辑）不进入复核", () => {
        const ctx = context({ namespaceNumber: 2, pageName: "User:Example", action: "edit" });
        assert.equal(decideScene(ctx, "完全不同的标题"), null);
    });

    it("用户页 articleId 非正（不存在页面）不进入复核", () => {
        const ctx = context({ namespaceNumber: 2, pageName: "User:Example", articleId: 0 });
        assert.equal(decideScene(ctx, "完全不同的标题"), null);
    });

    it("用户讨论页（NS 3）同样进入复核", () => {
        const ctx = context({ namespaceNumber: 3, pageName: "User_talk:Example" });
        assert.equal(decideScene(ctx, "改写标题"), "variant-check");
    });

    it("草稿命名空间（NS 118）显示草稿水印", () => {
        assert.equal(decideScene(context({ namespaceNumber: 118, pageName: "Draft:Foo" }), "Draft:Foo"), "draft");
    });

    it("其余命名空间且无历史版本 → 不显示", () => {
        const scene: WatermarkScene = decideScene(context({ namespaceNumber: 0 }), "Foo");
        assert.equal(scene, null);
    });
});

describe("hasVariantMatch", () => {
    const regex = getNamespacePrefixRegex(2, NAMESPACE_IDS);

    it("任一变体标题归一化后一致即匹配", () => {
        assert.equal(hasVariantMatch(["User:Foo", "User:某某", "User:Bar"], "User:某某", regex), true);
    });

    it("变体标题含前缀别名而显示标题不带时仍可匹配", () => {
        assert.equal(hasVariantMatch(["User:Foo"], "Foo", regex), true);
    });

    it("全部变体均不一致 → 不匹配", () => {
        assert.equal(hasVariantMatch(["User:Foo", "User:Bar"], "User:Baz", regex), false);
    });

    it("空变体列表 → 不匹配", () => {
        assert.equal(hasVariantMatch([], "User:Foo", regex), false);
    });
});
