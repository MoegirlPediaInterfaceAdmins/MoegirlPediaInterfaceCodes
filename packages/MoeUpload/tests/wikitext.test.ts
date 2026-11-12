import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults";
import { buildDescription, licenseTemplate, renderTemplate } from "../src/logic/wikitext";
import type { MoeUploadConfig, QueueItem } from "../src/types";

describe("renderTemplate", () => {
    it("替换占位符", () => {
        expect(renderTemplate("{{X|描述={{{description}}}}}", { description: "测试" })).toBe(
            "{{X|描述=测试}}",
        );
    });

    it("空值字段所在整行被剔除", () => {
        const template = ["{{示例模板", "|描述={{{description}}}", "|来源={{{source}}}", "}}"].join(
            "\n",
        );
        expect(renderTemplate(template, { description: "有值", source: "" })).toBe(
            "{{示例模板\n|描述=有值\n}}",
        );
    });

    it("支持连字符字段 id（替换与空值剔行）", () => {
        const template = ["{{示例模板", "|授权说明={{{license-note}}}", "}}"].join("\n");
        expect(renderTemplate(template, { "license-note": "原作者允许使用" })).toBe(
            "{{示例模板\n|授权说明=原作者允许使用\n}}",
        );
        expect(renderTemplate(template, {})).toBe("{{示例模板\n}}");
    });

    it("压缩多余空行", () => {
        const template = "A\n\n\n{{{a}}}\n\n\nB";
        expect(renderTemplate(template, { a: "x" })).toBe("A\n\nx\n\nB");
    });
});

describe("licenseTemplate / buildDescription", () => {
    it("按 id 取许可模板，未知 id 返回空串", () => {
        expect(licenseTemplate("Copyright", DEFAULT_CONFIG)).toBe("{{Copyright}}");
        expect(licenseTemplate("可自由使用", DEFAULT_CONFIG)).toBe("{{可自由使用}}");
        expect(licenseTemplate("nope", DEFAULT_CONFIG)).toBe("");
    });

    it("buildDescription 组装模板 + 派生分类与用户分类同行拼接", () => {
        const item = makeStubItem({
            meta: {
                work: "影之诗WB",
                author: "某人",
                source: "官方",
                description: "一张图",
            },
            licenseId: "PD-Old",
            categories: ["图像素材", "截图"],
        });
        const text = buildDescription(item, DEFAULT_CONFIG);
        expect(text).toContain("== 摘要 ==");
        expect(text).toContain("* 来源：官方");
        expect(text).toContain("== 许可协议 ==");
        expect(text).toContain("{{PD-Old}}");
        expect(
            text.endsWith(
                "[[Category:影之诗WB]][[Category:作者:某人]][[Category:图像素材]][[Category:截图]]",
            ),
        ).toBe(true);
    });

    it("作品/作者单侧为空时只生成另一侧的派生分类", () => {
        const item = makeStubItem({ meta: { author: "某人" } });
        const text = buildDescription(item, DEFAULT_CONFIG);
        expect(text).not.toContain("[[Category:]][[Category:作者:某人]]");
        expect(text.endsWith("[[Category:作者:某人]]")).toBe(true);

        const workOnly = buildDescription(
            makeStubItem({ meta: { work: "影之诗WB" } }),
            DEFAULT_CONFIG,
        );
        expect(workOnly.endsWith("[[Category:影之诗WB]]")).toBe(true);
    });

    it("多值字段逐值生成派生分类（混合分隔符）", () => {
        const item = makeStubItem({
            meta: { work: "影之诗WB、官方美术", author: "作者A，作者B; 作者C" },
        });
        const text = buildDescription(item, DEFAULT_CONFIG);
        expect(
            text.endsWith(
                "[[Category:影之诗WB]][[Category:官方美术]][[Category:作者:作者A]][[Category:作者:作者B]][[Category:作者:作者C]]",
            ),
        ).toBe(true);
    });

    it("派生分类值清洗非法标题字符并折叠空白", () => {
        const item = makeStubItem({ meta: { work: " 影之诗 [[WB]] #1 ", author: "" } });
        const text = buildDescription(item, DEFAULT_CONFIG);
        expect(text.endsWith("[[Category:影之诗 WB 1]]")).toBe(true);
    });

    it("空许可模板时授权行被剔除、分类仍然保留", () => {
        const config: MoeUploadConfig = {
            ...DEFAULT_CONFIG,
            licenses: [{ id: "none", label: "无", template: "" }],
        };
        const item = makeStubItem({ licenseId: "none", categories: ["截图"] });
        const text = buildDescription(item, config);
        expect(text).not.toContain("{{");
        expect(text.endsWith("[[Category:截图]]")).toBe(true);
    });

    it("分类字段值与用户分类全空时不追加分类行", () => {
        const item = makeStubItem({ meta: { source: "官方" } });
        const text = buildDescription(item, DEFAULT_CONFIG);
        expect(text).not.toContain("[[Category:");
        expect(text).toContain("== 摘要 ==");
    });

    it("完整输出结构基线（全栏目有值时逐字断言）", () => {
        const item = makeStubItem({
            meta: {
                work: "影之诗WB",
                author: "某人",
                source: "官方",
                description: "一张图",
            },
            licenseId: "Copyright",
            categories: ["截图"],
        });
        // 快照锁住整段结构（栏目顺序、换行、分类行拼接方式），只断言 toContain 会漏掉行序与空行回归
        expect(buildDescription(item, DEFAULT_CONFIG)).toMatchInlineSnapshot(`
          "== 摘要 ==
          * 来源：官方
          一张图
          == 许可协议 ==
          {{Copyright}}
          [[Category:影之诗WB]][[Category:作者:某人]][[Category:截图]]"
        `);
    });
});

const makeStubItem = (overrides: Partial<QueueItem>): QueueItem => ({
    id: "item-1",
    kind: "file",
    name: "stub.png",
    size: 1,
    status: "staged",
    ignoreWarnings: false,
    meta: {},
    licenseId: "other",
    categories: [],
    ...overrides,
});
