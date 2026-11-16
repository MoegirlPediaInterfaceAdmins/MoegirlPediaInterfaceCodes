import { describe, expect, it } from "vitest";
import lintMessage from "../../commitLint/lintMessage.js";
import normalizeEmptySubject from "../../commitLint/normalizeEmptySubject.js";

describe("normalizeEmptySubject", () => {
    it("补全仅含 type 或带冒号的空 subject 标头", () => {
        expect(normalizeEmptySubject("chore")).toBe("chore: _");
        expect(normalizeEmptySubject("chore:")).toBe("chore: _");
    });

    it("补全带 scope 与 breaking `!` 的空 subject 标头", () => {
        expect(normalizeEmptySubject("feat(core)")).toBe("feat(core): _");
        expect(normalizeEmptySubject("feat(core):")).toBe("feat(core): _");
        expect(normalizeEmptySubject("feat!")).toBe("feat!: _");
        expect(normalizeEmptySubject("feat(core)!:")).toBe("feat(core)!: _");
    });

    it("保留多行提交信息的正文内容", () => {
        expect(normalizeEmptySubject("chore\n\nsome body")).toBe("chore: _\n\nsome body");
        expect(normalizeEmptySubject("feat(core):\n\nbody line")).toBe("feat(core): _\n\nbody line");
    });

    it("保留已有 subject 的提交信息原样", () => {
        expect(normalizeEmptySubject("fix(core): 修复问题")).toBe("fix(core): 修复问题");
        expect(normalizeEmptySubject("feat: add feature\n\nbody")).toBe("feat: add feature\n\nbody");
    });

    it("不对带前后空白的畸形标头做处理", () => {
        expect(normalizeEmptySubject("  chore")).toBe("  chore");
        expect(normalizeEmptySubject("chore  ")).toBe("chore  ");
        expect(normalizeEmptySubject("chore: ")).toBe("chore: ");
    });

    it("配合 lintMessage 校验时合法空 subject 通过，非法类型或带空白标头失败", async () => {
        for (const msg of ["chore", "chore:", "feat(core)", "feat(core):", "feat!", "feat(core)!:"]) {
            const result = await lintMessage(normalizeEmptySubject(msg));
            expect(result).toEqual({ valid: true, errors: [] });
        }

        for (const msg of ["unknown", "unknown:", "  chore", "chore  ", "chore: "]) {
            const result = await lintMessage(normalizeEmptySubject(msg));
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        }
    });
});
