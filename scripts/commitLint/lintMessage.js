import lint from "@commitlint/lint";
import load from "@commitlint/load";

// 一次性解析 commitlint.config.mjs，供 commit message 与 PR 标题两处复用，避免各自重复加载。
const config = await load({}, { cwd: process.cwd() });

// 编程式 lint 不会自动套用 parserPreset：实测不传 parserOpts 时 `feat(scope)!: x`
// 会被误判为缺 type / subject（CLI 走的是另一条路径，故无此问题）。
const options = {
    ignores: config.ignores,
    defaultIgnores: config.defaultIgnores ?? true,
    parserOpts: config.parserPreset?.parserOpts,
    helpUrl: config.helpUrl,
};

/**
 * 用仓库的 commitlint 配置校验一条提交信息（或 PR 标题）。
 * @param {string} message
 * @returns {Promise<{ valid: boolean; errors: { name: string; message: string; }[]; }>}
 */
export default async (message) => {
    const result = await lint(message, config.rules, options);
    return { valid: result.valid, errors: result.errors };
};
