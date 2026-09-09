import { ESLint } from "eslint";
import { nodeLintTargets } from "../modules/lintTargets.js";

// 只保留 `--format` 这一个参数（CI 用它切换 GitHub Actions 注解格式），
// 其余原先写在 package.json 里的 flag 都成为本脚本的固定策略。
//
// 先解析参数再 lint：参数错误应当立即失败，不必白跑一遍扫描。
const formatIndex = process.argv.indexOf("--format");
const formatterName = formatIndex === -1 ? "stylish" : process.argv[formatIndex + 1];
// `--format` 后缺值会落到 undefined（loadFormatter 的默认参数会兜成 stylish），
// 但后跟另一个 flag（如 `--format --fix`）会被当成 formatter 名，抛出
// ERR_MODULE_NOT_FOUND 的原始堆栈。这里按 ESLint CLI 的语义以退出码 2 报错。
if (typeof formatterName !== "string" || formatterName.startsWith("-")) {
    process.stderr.write("Usage: npm run lint:scripts -- --format <formatter>\n");
    process.exit(2);
}

// 扫描范围与 eslint.config.js 的 node 配置共用 scripts/modules/lintTargets.js，
// 新增待检查的文件或目录只需改那一处，避免命令里写死文件名列表后漂移。
//
// 直接用 ESLint 的 Node API 而不是 spawn 一个 `npx eslint` 子进程：
// 省去 npx 解析与额外进程开销，且不必让脚本再依赖 CLI 的 flag 解析。
const eslint = new ESLint({
    cache: true,
    cacheStrategy: "content",
    cacheLocation: ".cache/",
});

let formatter;
try {
    formatter = await eslint.loadFormatter(formatterName);
} catch (error) {
    process.stderr.write(`Failed to load formatter "${formatterName}": ${error.message}\n`);
    process.exit(2);
}

const results = await eslint.lintFiles(nodeLintTargets);

// 不传 `color`：stylish 在 `color` 为 undefined 时用 Node 内置的 `util.styleText`
// 做终端检测（尊重 NO_COLOR / FORCE_COLOR 与 isTTY），因此重定向到文件时不会写入
// ANSI 序列，而交互终端下仍有颜色。若显式传 true 则会强制着色，日志文件里会出现转义码。
process.stdout.write(await formatter.format(results, {}));

const { errorCount, fatalErrorCount, warningCount } = results.reduce((counts, result) => ({
    errorCount: counts.errorCount + result.errorCount,
    fatalErrorCount: counts.fatalErrorCount + result.fatalErrorCount,
    warningCount: counts.warningCount + result.warningCount,
}), { errorCount: 0, fatalErrorCount: 0, warningCount: 0 });

if (fatalErrorCount > 0) {
    // 对齐 CLI 的 `--exit-on-fatal-error`：致命错误（如解析失败）单独以 2 退出。
    process.exitCode = 2;
} else {
    // 对齐 CLI 的 `--max-warnings 0`：任何 error 或 warning 都判负。
    process.exitCode = errorCount > 0 || warningCount > 0 ? 1 : 0;
}
