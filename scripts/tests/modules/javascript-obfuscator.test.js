import { afterEach, describe, expect, it, vi } from "vitest";

const obfuscatorMock = vi.hoisted(() => ({}));
vi.mock("javascript-obfuscator", () => {
    obfuscatorMock.obfuscate = vi.fn(() => "obfuscated-result");
    return { "default": { obfuscate: obfuscatorMock.obfuscate } };
});

import { obfuscate } from "../../modules/javascript-obfuscator.js";

// 进程环境变量在用例间共享，结束后按加载时的原样恢复（原本未设置则保持未设置）
const originalCI = process.env.CI;

afterEach(() => {
    if (originalCI === undefined) {
        Reflect.deleteProperty(process.env, "CI");
    } else {
        process.env.CI = originalCI;
    }
});

describe("obfuscate 对 CI 环境变量的恢复", () => {
    it("CI 原本未设置时调用后不留下任何值", () => {
        Reflect.deleteProperty(process.env, "CI");
        expect(obfuscate("code", {})).toBe("obfuscated-result");
        expect(Reflect.has(process.env, "CI")).toBe(false);
    });

    it("CI 原本的值在调用后原样保留", () => {
        process.env.CI = "true";
        obfuscate("code", {});
        expect(process.env.CI).toBe("true");
        process.env.CI = "false";
        obfuscate("code", {});
        expect(process.env.CI).toBe("false");
    });

    it("obfuscator 抛异常时环境同样被恢复", () => {
        Reflect.deleteProperty(process.env, "CI");
        obfuscatorMock.obfuscate.mockImplementationOnce(() => {
            throw new Error("boom");
        });
        expect(() => obfuscate("code", {})).toThrow("boom");
        expect(Reflect.has(process.env, "CI")).toBe(false);
    });
});
