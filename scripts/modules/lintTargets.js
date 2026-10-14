/**
 * `npm run lint:scripts` 与 eslint.config.js 的 node 配置共用的待检查文件范围。
 *
 * 两者引用同一份定义，避免各写一遍后在新增文件时漂移：新增需要检查的 Node 侧文件或目录，
 * 只需修改这里。用 glob 而非逐个文件名，故新增的根目录配置文件、`.husky/*.mjs` 会自动被覆盖。
 */
export const nodeLintTargets = [
    "scripts/**/*",
    "*.{js,mjs,cjs}",
    ".husky/*.mjs",
];
