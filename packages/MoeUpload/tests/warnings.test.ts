import { describe, expect, it } from "vitest";
import { describeWarnings } from "@/locale";

// 警告形态：exists 系拍平成「键=子类型、值=文件名」，duplicate 是文件名字符串数组，
// no-change / duplicate-version 改名为 nochange / duplicateversions 且只留时间戳
describe("describeWarnings · 键与形态对齐源码", () => {
    it("exists 系：值就是文件名", () => {
        expect(describeWarnings({ exists: "已存在的图片.png" })).toEqual([
            "同名文件已存在：已存在的图片.png",
        ]);
        expect(describeWarnings({ "exists-normalized": "foo.png" })).toEqual([
            "存在同名文件（名称归一化后相同）：foo.png",
        ]);
        expect(describeWarnings({ "bad-prefix": "thumb.png" })).toEqual([
            "文件名使用了被禁用的前缀：thumb.png",
        ]);
    });

    it("duplicate 是文件名字符串数组", () => {
        expect(describeWarnings({ duplicate: ["重复内容.jpg", "另一个.jpg"] })).toEqual([
            "内容与已有文件重复：重复内容.jpg、另一个.jpg",
        ]);
    });

    it("字符串型键直接给明细", () => {
        expect(describeWarnings({ badfilename: "a b.png" })).toEqual(["文件名不合规：a b.png"]);
        expect(describeWarnings({ "was-deleted": "old.png" })).toEqual([
            "该文件此前被删除过：old.png",
        ]);
    });

    it("nochange / duplicateversions 只保留时间戳", () => {
        expect(describeWarnings({ nochange: { timestamp: "2026-01-01T00:00:00Z" } })).toEqual([
            "内容与现有文件完全相同（无变更）：2026-01-01T00:00:00Z",
        ]);
        expect(
            describeWarnings({ duplicateversions: [{ timestamp: "2026-01-01T00:00:00Z" }] }),
        ).toEqual(["内容与历史版本重复：2026-01-01T00:00:00Z"]);
    });

    it("无明细的键（布尔/空值）只给文案", () => {
        expect(describeWarnings({ "empty-file": true })).toEqual(["文件内容为空"]);
        expect(describeWarnings({ "duplicate-archive": "" })).toEqual([
            "该内容曾在删除记录中出现过",
        ]);
    });

    it("扩展名清单里的计数不拼进文案", () => {
        expect(describeWarnings({ "filetype-unwanted-type": ["png", "jpg, webp", 20] })).toEqual([
            "该扩展名不在站点允许清单内：png、jpg, webp",
        ]);
    });

    it("未知键不暴露英文键名与原始值", () => {
        expect(describeWarnings({ "some-new-key": true })).toEqual(["存在其他冲突，请检查文件"]);
    });

    it("空对象也给可展示文案", () => {
        expect(describeWarnings({})).toEqual(["存在其他冲突，请检查文件"]);
    });

    it("多条警告逐条翻译", () => {
        expect(describeWarnings({ exists: "a.png", duplicate: ["b.jpg"] })).toEqual([
            "同名文件已存在：a.png",
            "内容与已有文件重复：b.jpg",
        ]);
    });
});
