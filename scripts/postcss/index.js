import { exec } from "node:child_process";
import { warning, startGroup, endGroup } from "@actions/core";
import console from "../modules/console.js";
import parseOutput from "./parseOutput.js";

console.info("Start to run postcss...");
startGroup("postcss output:");
/**
 * @type { string }
 */
const output = await new Promise((res, rej) => {
    const childProcess = exec("NO_COLOR=true npx postcss src/**/*.css --base src/ -d dist/ --verbose", (err, _, stderr) => {
        if (err) {
            rej(err);
        } else {
            res(stderr);
        }
    });
    childProcess.stdout?.pipe(process.stdout);
    childProcess.stderr?.pipe(process.stderr);
});
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
