import { describe, expect, it } from "vitest";
import countCommitChanges from "../../generateCommitsHistory/countCommitChanges.js";

describe("countCommitChanges", () => {
    it("src/ 文件有权改动计入 changedFiles 并置 touchedSrc", () => {
        const diff = { files: [{ file: "src/gadgets/A.js", changes: 5 }] };
        expect(countCommitChanges(diff, "abc123", new Map())).toEqual({ changedFiles: 1, touchedSrc: true });
    });

    it("非 src/ 文件完全忽略", () => {
        const diff = { files: [{ file: "scripts/main.js", changes: 10 }] };
        expect(countCommitChanges(diff, "abc123", new Map())).toEqual({ changedFiles: 0, touchedSrc: false });
    });

    it("纯重命名（0 0 路径）不计权但算 touched", () => {
        const diff = { files: [{ file: "src/gadgets/{A.js => B.js}", changes: 0 }] };
        expect(countCommitChanges(diff, "abc123", new Map())).toEqual({ changedFiles: 0, touchedSrc: true });
    });

    it("binary 文件无行数信息仍直接计权", () => {
        const diff = { files: [{ file: "src/gadgets/logo.png", binary: true }] };
        expect(countCommitChanges(diff, "abc123", new Map())).toEqual({ changedFiles: 1, touchedSrc: true });
    });

    it("changes 为 0 的普通 src 文件不计权但算 touched", () => {
        const diff = { files: [{ file: "src/gadgets/A.js", changes: 0 }] };
        expect(countCommitChanges(diff, "abc123", new Map())).toEqual({ changedFiles: 0, touchedSrc: true });
    });

    it("混合文件列表只累计 src/ 上的有权改动", () => {
        const diff = {
            files: [
                { file: "src/gadgets/A.js", changes: 3 },
                { file: "scripts/main.js", changes: 100 },
                { file: "src/gadgets/{A.js => B.js}", changes: 0 },
                { file: "src/gadgets/C.css", changes: 7 },
            ],
        };
        expect(countCommitChanges(diff, "abc123", new Map())).toEqual({ changedFiles: 2, touchedSrc: true });
    });

    it("空 files 数组返回零改动且未触碰 src", () => {
        expect(countCommitChanges({ files: [] }, "abc123", new Map())).toEqual({ changedFiles: 0, touchedSrc: false });
    });

    it("合并提交（diff 为 null）使用 mergeChangedFiles 的预计算值", () => {
        const mergeChangedFiles = new Map([["merge456", 3]]);
        expect(countCommitChanges(null, "merge456", mergeChangedFiles)).toEqual({ changedFiles: 3, touchedSrc: true });
    });

    it("diff 为 null 且 hash 不在 mergeChangedFiles 时返回零值", () => {
        expect(countCommitChanges(null, "not-in-map", new Map())).toEqual({ changedFiles: 0, touchedSrc: false });
    });

    it("diff 为 undefined 时同样走合并提交分支", () => {
        const mergeChangedFiles = new Map([["merge789", 2]]);
        expect(countCommitChanges(undefined, "merge789", mergeChangedFiles)).toEqual({ changedFiles: 2, touchedSrc: true });
    });

    it("diff.files 有效时优先于 mergeChangedFiles", () => {
        const diff = { files: [{ file: "src/a.js", changes: 1 }] };
        const mergeChangedFiles = new Map([["abc123", 99]]);
        expect(countCommitChanges(diff, "abc123", mergeChangedFiles)).toEqual({ changedFiles: 1, touchedSrc: true });
    });
});
