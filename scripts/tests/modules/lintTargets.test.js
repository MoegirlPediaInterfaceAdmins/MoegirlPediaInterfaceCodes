import { describe, expect, it } from "vitest";
import { nodeLintTargets } from "../../modules/lintTargets.js";

describe("nodeLintTargets", () => {
    it("包含 eslint.config.js 与 scripts/eslint 共用的全部关键路径模式", () => {
        expect(nodeLintTargets).toEqual([
            "scripts/**/*",
            // packages/ 内的构建脚本与 Node 侧配置文件
            "packages/*/scripts/**/*",
            "packages/*/rollup.config.js",
            "packages/*/vitest.config.ts",
            "*.{js,mjs,cjs}",
            ".husky/*.mjs",
        ]);
    });
});
