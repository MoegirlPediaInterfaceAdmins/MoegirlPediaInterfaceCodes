import { spawn } from "node:child_process";
import { pipeFiltered, resolveForceColor } from "./childOutput.js";

// v8r 的 schema 查找日志会为每个 definition.yaml 打印两行噪音，在 CI 里会淹没真正的校验结果。
// 这里在 Node 侧按行过滤（过滤与 FORCE_COLOR 的实现见 ./childOutput.js），而不是用 shell 管道 + grep：
// 1. 管道会把退出码替换成 grep 的退出码，导致 v8r 校验失败被静默放过（历史上确实如此）；
// 2. `grep -P` 与花括号命令组在 macOS 自带 BSD grep / Windows cmd.exe 上不可用。
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const childProcess = spawn(npxCommand, ["v8r"], {
    stdio: ["inherit", "pipe", "pipe"],
    env: {
        ...process.env,
        FORCE_COLOR: resolveForceColor(process.stdout, process.env),
    },
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
