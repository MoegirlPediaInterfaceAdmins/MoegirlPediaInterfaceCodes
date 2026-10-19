import { describe, expect, it, vi } from "vitest";

// mailmap 是「import 即读 .mailmap」的模块；vi.mock 会被提升到模块加载之前执行，
// 被测模块拿到的是这份固定映射而非真实文件，行为从而可确定
vi.mock("../../modules/mailmap.js", () => ({
    "default": {
        "mapped@example.com": "MappedUser",
    },
}));

import { isFromGithubWebInterface, parseCoAuthor, removeSplitter } from "../../generateCommitsHistory/attribution.js";

describe("isFromGithubWebInterface", () => {
    const webCommit = {
        signatureStatus: "G",
        signatureSigner: "web-flow <noreply@github.com>",
        committerName: "GitHub",
        committerEmail: "noreply@github.com",
    };

    it("签名有效且三重匹配时判定为网页界面提交", () => {
        expect(isFromGithubWebInterface(webCommit)).toBe(true);
    });

    it("过期密钥（Y）同样接受，避免丢失旧密钥签名的历史提交", () => {
        expect(isFromGithubWebInterface({ ...webCommit, signatureStatus: "Y" })).toBe(true);
    });

    it("无签名（N）与签名损坏（B）均不可信", () => {
        expect(isFromGithubWebInterface({ ...webCommit, signatureStatus: "N" })).toBe(false);
        expect(isFromGithubWebInterface({ ...webCommit, signatureStatus: "B" })).toBe(false);
    });

    it("signer 邮箱不是 noreply@github.com 时拒绝", () => {
        expect(isFromGithubWebInterface({ ...webCommit, signatureSigner: "web-flow <evil@example.com>" })).toBe(false);
    });

    it("committer 姓名与邮箱任一不匹配时拒绝（防单字段伪造）", () => {
        expect(isFromGithubWebInterface({ ...webCommit, committerName: "NotGitHub" })).toBe(false);
        expect(isFromGithubWebInterface({ ...webCommit, committerEmail: "other@github.com" })).toBe(false);
    });
});

describe("removeSplitter", () => {
    it("剥掉紧贴末尾的分隔符 ò 并去除首尾空白", () => {
        expect(removeSplitter("valueò")).toBe("value");
        expect(removeSplitter("  valueò")).toBe("value");
    });

    it("分隔符不在字符串最末（其后有空格）时不剥离，仅做 trim", () => {
        expect(removeSplitter("padded ò ")).toBe("padded ò");
    });

    it("无分隔符时仅做 trim", () => {
        expect(removeSplitter("plain")).toBe("plain");
    });
});

describe("parseCoAuthor", () => {
    it("邮箱在 mailmap 中时用户名取 U: 映射名", () => {
        expect(parseCoAuthor("Co-authored-by: Raw Name <Mapped@Example.com>")).toEqual({
            name: "Raw Name",
            email: "mapped@example.com",
            username: "U:MappedUser",
        });
    });

    it("邮箱不在 mailmap 中时用户名取 GH: 原始姓名", () => {
        expect(parseCoAuthor("Co-authored-by: Someone <other@example.com>")).toEqual({
            name: "Someone",
            email: "other@example.com",
            username: "GH:Someone",
        });
    });

    it("邮箱中出现额外 \" <\" 序列时按首个拆分并拼回", () => {
        expect(parseCoAuthor("Co-authored-by: A <b <c@example.com>")).toEqual({
            name: "A",
            email: "b <c@example.com",
            username: "GH:A",
        });
    });
});
