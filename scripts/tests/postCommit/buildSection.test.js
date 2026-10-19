import { describe, expect, it } from "vitest";
import buildSection from "../../postCommit/buildSection.js";

describe("buildSection", () => {
    it("以「### <job名> 失败」标题开头", () => {
        expect(buildSection("lint", ["- 步骤 A"], "").split("\n")[0]).toBe("### lint 失败");
    });

    it("失败步骤逐行列出", () => {
        expect(buildSection("lint", ["- 步骤 A", "- 步骤 B"], "")).toContain("失败步骤：\n\n- 步骤 A\n- 步骤 B");
    });

    it("失败步骤为空时展示兜底文案", () => {
        expect(buildSection("lint", [], "")).toContain("失败步骤：\n\n- （无法获取失败步骤）\n");
    });

    it("日志非空时追加折叠的报错日志块并以其收尾", () => {
        const section = buildSection("lint", ["- 步骤 A"], "Error: boom");
        expect(section.endsWith("```text\nError: boom\n```\n\n</details>")).toBe(true);
        expect(section).toContain("<details>\n<summary>报错日志（末尾 200 行）</summary>");
    });

    it("日志为空时省略整个 details 块", () => {
        expect(buildSection("lint", ["- 步骤 A"], "")).not.toContain("<details>");
    });

    it("无日志时的完整输出", () => {
        expect(buildSection("lint", ["- 步骤 A"], "")).toBe("### lint 失败\n\n失败步骤：\n\n- 步骤 A\n");
    });

    it("有日志时的完整输出", () => {
        expect(buildSection("job1", ["- s1"], "log line")).toBe("### job1 失败\n\n失败步骤：\n\n- s1\n\n<details>\n<summary>报错日志（末尾 200 行）</summary>\n\n```text\nlog line\n```\n\n</details>");
    });
});
