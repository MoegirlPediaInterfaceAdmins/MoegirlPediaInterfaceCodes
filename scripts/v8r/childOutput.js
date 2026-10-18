// 本文件与入口 scripts/v8r/index.js 一样只依赖 node: 内置模块：
// v8r 脚本刻意保持零外部依赖，不得引入 modules/ 或 npm 包。

// v8r 的 schema 查找日志会为每个 definition.yaml 打印两行噪音（过滤原因见入口脚本）。
const noisePattern = /(?:Searching for|Found) schema in \.v8rrc\.yaml \.\.\./u;

/**
 * 把子进程输出按行转发到目标流，丢弃噪音行。
 *
 * @param {import("node:stream").Readable} readable
 * @param {NodeJS.WritableStream} writable
 */
export const pipeFiltered = (readable, writable) => {
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

/**
 * 计算应传给子进程的 FORCE_COLOR 取值（stdout 与 env 由入参注入，便于测试）。
 * @param {{ getColorDepth?: () => number; }} stdout 本进程的 stdout
 * @param {NodeJS.ProcessEnv} env 本进程的环境变量
 * @returns {string} "0" | "1" | "2" | "3"
 */
export const resolveForceColor = (stdout, env) => typeof stdout.getColorDepth === "function"
    ? forceColorByDepth.get(stdout.getColorDepth()) ?? "0"
    : ["1", "2", "3"].includes(env.FORCE_COLOR) ? env.FORCE_COLOR : "0";
