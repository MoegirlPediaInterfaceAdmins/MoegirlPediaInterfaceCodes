import { describe, expect, it } from "vitest";

// lintMessage 顶层从 cwd 加载仓库真实的 commitlint.config.mjs，
// 从仓库根运行测试即可命中该配置，无需任何 mock；断言只覆盖明确合法/明确非法的样例，
// 不锁死具体规则名，规则随仓库演进时用例仍然成立
import lintMessage from "../../commitLint/lintMessage.js";

describe("lintMessage", () => {
    it("标准 conventional 提交信息校验通过且无错误", async () => {
        await expect(lintMessage("fix(core): 修复加载失败的问题")).resolves.toEqual({
            valid: true,
            errors: [],
        });
    });

    it("带 scope 与 breaking 标记的提交信息校验通过", async () => {
        await expect(lintMessage("feat(api)!: 变更响应结构")).resolves.toMatchObject({ valid: true });
    });

    it("仓库自定义的 npm 前缀（dependabot 提交）校验通过", async () => {
        const { valid, errors } = await lintMessage("npm: bump acorn from 8.1.0 to 8.2.0");
        expect(valid).toBe(true);
        expect(errors).toEqual([]);
    });

    it("仓库自定义的 auto / gha 前缀（CI 自动提交）校验通过", async () => {
        await expect(lintMessage("auto: 更新构建产物")).resolves.toMatchObject({ valid: true });
        await expect(lintMessage("gha: bump actions/checkout from 4 to 5")).resolves.toMatchObject({ valid: true });
    });

    it("缺少类型与冒号的提交信息校验失败且 errors 非空", async () => {
        const { valid, errors } = await lintMessage("update something");
        expect(valid).toBe(false);
        expect(errors.length).toBeGreaterThan(0);
        for (const { name, message } of errors) {
            expect(typeof name).toBe("string");
            expect(typeof message).toBe("string");
        }
    });

    it("类型不在 type-enum 白名单内时校验失败", async () => {
        const { valid, errors } = await lintMessage("random: do something");
        expect(valid).toBe(false);
        expect(errors.length).toBeGreaterThan(0);
    });

    it("类型后缺少 subject 时校验失败", async () => {
        const { valid, errors } = await lintMessage("feat:");
        expect(valid).toBe(false);
        expect(errors.length).toBeGreaterThan(0);
    });

    // 空消息不会走规则校验：options 里 defaultIgnores 默认开启，@commitlint/is-ignored
    // 把（去除 merge/revert 等前缀后）内容为空的消息整体视为忽略项，直接判 valid
    it("空提交信息命中 defaultIgnores 被整体跳过，返回 valid", async () => {
        await expect(lintMessage("")).resolves.toEqual({
            valid: true,
            errors: [],
        });
    });
});
