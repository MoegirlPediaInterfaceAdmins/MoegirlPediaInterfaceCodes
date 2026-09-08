import { spawn } from "node:child_process";
import { nodeLintTargets } from "../modules/lintTargets.js";

// 扫描范围与 eslint.config.js 的 node 配置共用 scripts/modules/lintTargets.js，
// 新增待检查的文件或目录只需改那一处，避免命令里写死文件名列表后漂移。
// 用 Node 脚本而非 shell 命令替换（`$(...)`），以保证 Windows cmd.exe 下同样可用。
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const childProcess = spawn(npxCommand, ["eslint", ...nodeLintTargets, ...process.argv.slice(2)], {
    stdio: "inherit",
});
childProcess.on("error", (error) => {
    process.stderr.write(`Failed to run eslint: ${error.message}\n`);
    process.exitCode = 1;
});
childProcess.on("exit", (exitCode, signal) => {
    process.exitCode = exitCode ?? (signal ? 1 : 0);
});
