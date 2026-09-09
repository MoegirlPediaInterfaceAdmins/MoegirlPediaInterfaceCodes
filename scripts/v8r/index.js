import { spawn } from "node:child_process";

// v8r 的 schema 查找日志会为每个 definition.yaml 打印两行噪音，在 CI 里会淹没真正的校验结果。
// 这里在 Node 侧按行过滤，而不是用 shell 管道 + grep：
// 1. 管道会把退出码替换成 grep 的退出码，导致 v8r 校验失败被静默放过（历史上确实如此）；
// 2. `grep -P` 与花括号命令组在 macOS 自带 BSD grep / Windows cmd.exe 上不可用。
const noisePattern = /(?:Searching for|Found) schema in \.v8rrc\.yaml \.\.\./u;
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

/**
 * 把子进程输出按行转发到目标流，丢弃噪音行。
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

// 输出必须 pipe 才能过滤噪音，但 v8r 用 chalk 判断颜色，看到管道就会降级为无色，
// 导致交互终端下颜色丢失。这里先算出本进程支持的色深，再以等价的 FORCE_COLOR 传给子进程。
//
// 优先用官方的 process.stdout.getColorDepth()：它综合 isTTY、TERM、FORCE_COLOR 与
// NO_COLOR 给出色深（1=无色、4=16 色、8=256 色、24=truecolor）。但该方法只定义在 TTY
// 流上，管道/重定向时不存在，此时直接沿用调用方的 FORCE_COLOR。
//
// FORCE_COLOR 的取值与色深一一对应（0=无色、1=16 色、2=256 色、3=truecolor），
// 必须按色深映射而不是一律置 1，否则会丢失 256 色/真彩信息。
const forceColorByDepth = new Map([
    [1, "0"],
    [4, "1"],
    [8, "2"],
    [24, "3"],
]);
const forceColorValue = typeof process.stdout.getColorDepth === "function"
    ? forceColorByDepth.get(process.stdout.getColorDepth()) ?? "0"
    : ["1", "2", "3"].includes(process.env.FORCE_COLOR) ? process.env.FORCE_COLOR : "0";
const childProcess = spawn(npxCommand, ["v8r"], {
    stdio: ["inherit", "pipe", "pipe"],
    env: {
        ...process.env,
        FORCE_COLOR: forceColorValue,
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
