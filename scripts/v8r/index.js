import { spawn } from "node:child_process";

// v8r 的 schema 查找日志会为每个 definition.yaml 打印两行噪音，在 CI 里会淹没真正的校验结果。
// 这里在 Node 侧按行过滤，而不是用 shell 管道 + grep：
// 1. 管道会把退出码替换成 grep 的退出码，导致 v8r 校验失败被静默放过（历史上确实如此）；
// 2. `grep -P` 与花括号命令组在 macOS 自带 BSD grep / Windows cmd.exe 上不可用。
const noisePattern = /(?:Searching for|Found) schema in \.v8rrc\.yaml \.\.\./u;
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

/**
 * 把子进程输出按行转发到目标流，丢弃噪音行；不注入颜色相关环境变量，
 * 让 v8r 沿用调用方的颜色设置（v8r 默认无色，仅在 FORCE_COLOR 等设置下着色）。
 *
 * @param {import("node:stream").Readable} readable
 * @param {NodeJS.WritableStream} writable
 */
const pipeFiltered = (readable, writable) => {
    let carry = "";
    readable.setEncoding("utf8");
    readable.on("data", (chunk) => {
        const lines = `${carry}${chunk}`.split("\n");
        // 最后一段可能是不完整的行，留到下一次数据到达时再处理
        carry = lines.pop();
        for (const line of lines) {
            if (!noisePattern.test(line)) {
                writable.write(`${line}\n`);
            }
        }
    });
    readable.on("end", () => {
        if (carry && !noisePattern.test(carry)) {
            writable.write(carry);
        }
    });
};

const childProcess = spawn(npxCommand, ["v8r"], {
    stdio: ["inherit", "pipe", "pipe"],
});
pipeFiltered(childProcess.stdout, process.stdout);
pipeFiltered(childProcess.stderr, process.stderr);
childProcess.on("error", (error) => {
    process.stderr.write(`Failed to run v8r: ${error.message}\n`);
    process.exitCode = 1;
});
childProcess.on("exit", (exitCode, signal) => {
    // 透传 v8r 的退出码；被信号终止时视为失败
    process.exitCode = exitCode ?? (signal ? 1 : 0);
});
