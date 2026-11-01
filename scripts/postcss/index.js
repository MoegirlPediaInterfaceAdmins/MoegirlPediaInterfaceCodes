import { exec } from "node:child_process";
import { promisify } from "node:util";
import { warning, startGroup, endGroup } from "@actions/core";
import console from "../modules/console.js";
import parseOutput from "./parseOutput.js";

console.info("Start to run postcss...");
startGroup("postcss output:");
const execAsync = promisify(exec);
/**
 * 两段输入与 npm run build:css 一致：手写 CSS 来自 src/，构建产物 CSS 来自
 * dist/_generated（需先 npm run build:artifacts 生成），base 均使输出落入 dist/ 对应路径
 * @param {string} globArgs glob 与 --base 参数
 * @returns {Promise<string>} postcss 的 stderr 输出（warning 所在，收集后交 parseOutput 解析）
 */
const runPostcss = async (globArgs) => {
    const { stdout, stderr } = await execAsync(`NO_COLOR=true npx postcss ${globArgs} -d dist/ --verbose`);
    // --verbose 的处理文件清单在 stdout，原样透传到终端（CI 日志）
    process.stdout.write(stdout);
    return stderr;
};
const output = [
    await runPostcss("'src/**/*.css' --base src/"),
    await runPostcss("'dist/_generated/**/*.css' --base dist/_generated/"),
].join("\n");
endGroup();

const annotations = parseOutput(output, process.env.GITHUB_REPOSITORY, process.env.GITHUB_SHA);

if (annotations.length > 0) {
    console.warn("PostCSS has some warnings:");
    for (const [msg, annotationProperties] of annotations) {
        warning(msg, annotationProperties);
    }
} else {
    console.info("PostCSS has no warnings.");
}
