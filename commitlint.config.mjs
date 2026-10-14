// 仓库历史上存在三类非标准但合法的提交前缀，严格套用 config-conventional 会大面积误报：
// - `npm` / `gha`：dependabot 的 commit-message.prefix（见 .github/dependabot.yaml）；
// - `auto`：postCommit CI 自动生成提交使用的前缀（见 scripts/modules/createCommit.js）。
// 这三类前缀在下方 `type-enum` 中显式放行即可；不要用 `ignores` 整条跳过，
// 否则 `auto:`、`npm: ` 这类空 subject 的畸形提交也会被静默放过。
export default {
    "extends": ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [2, "always", [
            "build",
            "chore",
            "ci",
            "docs",
            "feat",
            "fix",
            "perf",
            "refactor",
            "revert",
            "style",
            "test",
            "npm",
            "gha",
            "auto",
        ]],
        // 仓库提交标题习惯携带 PR 编号，且正文常含自动生成的长行（如提交历史），放宽行宽限制。
        "header-max-length": [2, "always", 140],
        "body-max-line-length": [0],
        "footer-max-line-length": [0],
        // 中文描述无法用 case 规则约束，且历史上存在以专有名词开头的英文标题。
        "subject-case": [0],
    },
};
