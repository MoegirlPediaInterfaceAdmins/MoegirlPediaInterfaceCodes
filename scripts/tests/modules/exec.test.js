import { describe, expect, it } from "vitest";
import exec from "../../modules/exec.js";

describe("exec", () => {
    it("命令成功时 resolve 去除首尾空白后的 stdout", async () => {
        await expect(exec("echo hello")).resolves.toBe("hello");
    });

    it("stdout 两侧的空格与尾部换行被一并 trim", async () => {
        await expect(exec(`"${process.execPath}" -e "process.stdout.write('  padded  \\n')"`)).resolves.toBe("padded");
    });

    it("命令写入 stderr 但退出码为 0 时仍 resolve（stderr 不参与成功判定）", async () => {
        await expect(exec(`"${process.execPath}" -e "process.stderr.write('warning')"`)).resolves.toBe("");
    });

    it("非零退出码时 reject 带 exitCode 的 Error，并携带 error 与 trim 后的 stdout / stderr", async () => {
        const command = `"${process.execPath}" -e "console.log('out'); console.error('err'); process.exit(3)"`;
        let reason;
        await exec(command).catch((rejection) => {
            reason = rejection;
        });
        // 与 spawnAsync 的约定对齐：reject Error（有 message/stack），退出码挂在 exitCode 上
        expect(reason).toBeInstanceOf(Error);
        expect(reason.message).toBe(`${command} exited with code 3`);
        expect(reason.exitCode).toBe(3);
        expect(reason.error).toBeInstanceOf(Error);
        expect(reason.error.code).toBe(3);
        expect(reason.stdout).toBe("out");
        expect(reason.stderr).toBe("err");
    });

    // 127 是 POSIX shell「命令不存在」的退出码；cmd.exe 返回其他值，故仅 POSIX 断言
    it.skipIf(process.platform === "win32")("命令不存在时同样 reject（shell 以 127 退出）", async () => {
        let reason;
        await exec("definitely-not-a-command-xyz").catch((rejection) => {
            reason = rejection;
        });
        expect(reason).toBeInstanceOf(Error);
        expect(reason.exitCode).toBe(127);
        expect(reason.error.code).toBe(127);
        expect(reason.stderr).not.toBe("");
    });

    // kill -9 $$ 让 shell 自身被 SIGKILL 终止：此时 error.code 为 null、signal 有值，
    // 约定与 spawnAsync 一致——消息带信号名，exitCode 兜底为数字 1 而非 null
    it.skipIf(process.platform === "win32")("子进程被信号终止时 reject 的 exitCode 兜底为 1，消息带信号名", async () => {
        const command = "kill -9 $$";
        let reason;
        await exec(command).catch((rejection) => {
            reason = rejection;
        });
        expect(reason).toBeInstanceOf(Error);
        expect(reason.message).toBe(`${command} exited unexpectedly with signal SIGKILL`);
        expect(reason.exitCode).toBe(1);
        expect(reason.error.code).toBeNull();
        expect(reason.error.signal).toBe("SIGKILL");
    });
});
