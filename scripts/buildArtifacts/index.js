import console from "../modules/console.js";
import spawnAsync from "../modules/spawnAsync.js";
console.info("Initialization done.");

// 三类产物（browserify / vendor / packages）统一产出到 dist/_generated/gadgets（gitignore
// 覆盖，不进入仓库），随后由 tsconfig.artifacts.json（JS → dist/_compiled）与 build:css 的
// 第二段（CSS → dist/）并入部署链。全程只读 node_modules 与本地源码，无外网访问。
// 顺序执行：任一步失败即中断（spawnAsync 对非零退出码抛错），避免半成品进入编译链。
console.info("Building browserify artifacts...");
await spawnAsync("node", ["scripts/browserify/index.js"]);

console.info("Building vendor artifacts...");
await spawnAsync("node", ["scripts/vendor/index.js"]);

console.info("Building package artifacts...");
await spawnAsync("node", ["scripts/buildPackages/index.js"]);

console.info("All artifacts built.");
