// Husky 官方推荐的静默安装脚本。
// `prepare` 在 `npm ci --omit=dev` 时也会执行，而 husky 属于 devDependencies，
// 直接写 "prepare": "husky" 会让生产安装因找不到 husky 而失败（CI=true 亦无需安装钩子）。
if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
    process.exit(0);
}
const husky = (await import("husky")).default;
console.log(husky());
