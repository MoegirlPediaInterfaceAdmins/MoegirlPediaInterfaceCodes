import { afterEach, describe, expect, it } from "vitest";
import spawnAsync, { commandForPlatform } from "../../modules/spawnAsync.js";

describe("commandForPlatform", () => {
    // process.platform 的描述符是 writable:false / configurable:true，
    // 覆写只能走 defineProperty，还原也必须用原始完整描述符（直接赋值会静默失败）
    const platformDescriptor = Reflect.getOwnPropertyDescriptor(process, "platform");

    afterEach(() => {
        Reflect.defineProperty(process, "platform", platformDescriptor);
    });

    const setPlatform = (value) => {
        Reflect.defineProperty(process, "platform", { ...platformDescriptor, value });
    };

    it("linux 平台返回原名", () => {
        setPlatform("linux");
        expect(commandForPlatform("npm")).toBe("npm");
    });

    it("darwin 平台同样返回原名", () => {
        setPlatform("darwin");
        expect(commandForPlatform("npm")).toBe("npm");
    });

    it("win32 平台追加 .cmd 后缀", () => {
        setPlatform("win32");
        expect(commandForPlatform("npx")).toBe("npx.cmd");
    });
});

describe("spawnAsync", () => {
    it("退出码为 0 时 resolve undefined", async () => {
        await expect(spawnAsync(process.execPath, ["-e", ""])).resolves.toBeUndefined();
    });

    it("退出码非 0 时 reject，错误带 exitCode 与包含命令和退出码的消息", async () => {
        const args = ["-e", "process.exit(7)"];
        let reason;
        await spawnAsync(process.execPath, args).catch((rejection) => {
            reason = rejection;
        });
        expect(reason).toBeInstanceOf(Error);
        expect(reason.exitCode).toBe(7);
        expect(reason.message).toBe(`${process.execPath} ${args.join(" ")} exited with code 7`);
    });

    // SIGTERM 语义是 POSIX 专属（Windows 的 cmd 无对应信号行为），仅 POSIX 断言
    it.skipIf(process.platform === "win32")("被信号终止（close 回调 code 为 null）时 exitCode 兜底为 1，消息改为 unexpected + 信号名", async () => {
        const args = ["-e", "process.kill(process.pid, 'SIGTERM')"];
        let reason;
        await spawnAsync(process.execPath, args).catch((rejection) => {
            reason = rejection;
        });
        expect(reason).toBeInstanceOf(Error);
        expect(reason.exitCode).toBe(1);
        expect(reason.message).toBe(`${process.execPath} ${args.join(" ")} exited unexpectedly with signal SIGTERM`);
    });
});
