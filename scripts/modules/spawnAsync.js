import { spawn } from "node:child_process";

/**
 * Windows 下 npm / npx 等命令的实际文件名带 .cmd 后缀，直接以原名 spawn 会找不到文件。
 * @param {string} name 命令名，如 "npm"、"npx"
 */
export const commandForPlatform = (name) => process.platform === "win32" ? `${name}.cmd` : name;

/**
 * 运行子进程，把标准输出与错误输出直接接到当前进程，保证输出实时可见。
 * 退出码非 0 或被信号终止时 reject，错误对象带 exitCode 属性（信号终止时为 1）。
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export default (command, args) => new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    // 用 close 而不是 exit：close 在 stdio 流写完后才触发，输出不会被截断
    child.on("close", (code, signal) => {
        if (code === 0) {
            resolve();
            return;
        }
        const message = typeof code === "number"
            ? `${command} ${args.join(" ")} exited with code ${code}`
            : `${command} ${args.join(" ")} exited unexpectedly${signal ? ` with signal ${signal}` : ""}`;
        reject(Object.assign(new Error(message), { exitCode: code ?? 1 }));
    });
});
