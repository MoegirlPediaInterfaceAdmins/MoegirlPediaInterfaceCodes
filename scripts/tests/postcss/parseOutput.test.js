import { describe, expect, it } from "vitest";
import parseOutput from "../../postcss/parseOutput.js";

const repository = "owner/repo";
// sha 在链接中截取前 7 位
const sha = "0123456789abcdef";

describe("parseOutput", () => {
    it("Finished 行确定当前文件，警告行生成注解", () => {
        expect(parseOutput("Finished src/a.css in 512ms\n12:5 ⚠ Missing semicolon\n", repository, sha)).toEqual([
            [
                "Missing semicolon @ https://github.com/owner/repo/blob/0123456/src/a.css#L12",
                { title: "PostCSS Annotation", file: "src/a.css", startLine: 12, startColumn: 5 },
            ],
        ]);
    });

    it("行列号前缀缺失时 startLine 与 startColumn 为 NaN", () => {
        const annotations = parseOutput("Finished src/a.css in 1ms\nwarning ⚠ plain text\n", repository, sha);
        expect(Number.isNaN(annotations[0][1].startLine)).toBe(true);
        expect(Number.isNaN(annotations[0][1].startColumn)).toBe(true);
        expect(annotations[0][0]).toBe("plain text @ https://github.com/owner/repo/blob/0123456/src/a.css#LNaN");
    });

    it("警告出现在任何 Finished 行之前时 file 为 undefined", () => {
        const annotations = parseOutput("1:1 ⚠ early\nFinished src/a.css in 1ms\n", repository, sha);
        expect(annotations[0][1].file).toBe(undefined);
        expect(annotations[0][0]).toBe("early @ https://github.com/owner/repo/blob/0123456/undefined#L1");
    });

    it("多文件时文件名跟随最近一条 Finished 行", () => {
        const annotations = parseOutput("Finished a.css in 1ms\n1:2 ⚠ w1\nFinished b.css in 2ms\n3:4 ⚠ w2\n", repository, sha);
        expect(annotations).toHaveLength(2);
        expect(annotations[0][1]).toMatchObject({ file: "a.css", startLine: 1, startColumn: 2 });
        expect(annotations[1][1]).toMatchObject({ file: "b.css", startLine: 3, startColumn: 4 });
    });

    it("不含「 in」的 Finished 行不更新文件名", () => {
        const annotations = parseOutput("Finished first.css in 1ms\nFinished second.css\n1:1 ⚠ w\n", repository, sha);
        expect(annotations[0][1].file).toBe("first.css");
    });

    it("文件名含空格时链接按 encodeURI 转义", () => {
        const annotations = parseOutput("Finished my file.css in 1ms\n2:3 ⚠ w\n", repository, sha);
        expect(annotations[0][0]).toBe("w @ https://github.com/owner/repo/blob/0123456/my%20file.css#L2");
    });

    it("空输出返回空列表", () => {
        expect(parseOutput("", repository, sha)).toEqual([]);
    });

    it("无警告行的输出返回空列表", () => {
        expect(parseOutput("Finished a.css in 1ms\nplain line\n", repository, sha)).toEqual([]);
    });
});
