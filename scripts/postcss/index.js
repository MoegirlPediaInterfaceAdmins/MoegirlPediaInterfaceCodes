import { exec } from "node:child_process";
import { warning, startGroup, endGroup } from "@actions/core";
import console from "../modules/console.js";

console.info("Start to run postcss...");
startGroup("postcss output:");
/**
 * @type { string }
 */
const output = await new Promise((res, rej) => {
    const childProcess = exec("npx postcss src/**/*.css --base src/ -d dist/ --verbose", (err, _, stderr) => {
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

/**
 * @type { [string, import("@actions/core").AnnotationProperties][] }
 */
const annotations = [];
/**
 * @type { string }
 */
let lastFileName;
for (const line of output.split("\n")) {
    if (line.startsWith("Finished")) {
        const match = line.match(/Finished (.*?) in/)?.[1];
        if (match) {
            lastFileName = match;
        }
    }
    if (line.includes("⚠")) {
        /**
         * @type { import("@actions/core").AnnotationProperties }
         */
        const annotationProperties = {
            title: "PostCSS Annotation",
            file: lastFileName,
            startLine: +line.match(/^(\d+):(\d+)/)?.[1],
            startColumn: +line.match(/^(\d+):(\d+)/)?.[2],
        };
        const fileLink = `https://github.com/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_SHA.slice(0, 7)}/${encodeURI(`${lastFileName}#L${annotationProperties.startLine}`)}`;
        const msg = `${line.replace(/^.*?⚠\s*/, "")} @ ${fileLink}`;
        annotations.push([msg, annotationProperties]);
    }
}

if (annotations.length > 0) {
    console.warn("PostCSS has some warnings:");
    for (const [msg, annotationProperties] of annotations) {
        warning(msg, annotationProperties);
    }
} else {
    console.info("PostCSS has no warnings.");
}
