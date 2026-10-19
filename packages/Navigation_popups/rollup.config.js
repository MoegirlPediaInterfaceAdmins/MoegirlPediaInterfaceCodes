import esbuild from "rollup-plugin-esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

// The banner only carries the generated-file warning, the repo URL and the
// strict directive; upstream provenance (the behavior-baseline oldid) lives
// in the README's 来源与授权 section.
// "use strict" is the artifact's only strict directive — build.js strips the
// per-module prologues esbuild injects, so this one survives alone.
// The artifact ships as bare top-level statements (format "es"): the gadget
// always reaches the wiki through mw.loader.implement, whose function scope
// isolates top-level names (var declarations included), so no IIFE wrapper
// is needed and the entry module has no imports/exports left to keep.
// No eslint directives ride in the banner: the artifact is not linted
// anywhere — the repo lint ignores it (src/gadgets/Navigation_popups/
// .eslint-exemptions.yaml) and the build does not lint it either; it ships exactly
// as rollup/esbuild print it, and nothing downstream lints it.
const banner = `/**
 * 本文件由 packages/Navigation_popups 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */
"use strict";`;

// Modules allowed to participate in rollup-reported cycles (see onwarn).
// Current cycle inventory (collected via a probe run against rollup's API):
// options↔pageinfo; events↔selection; events↔shortcutkeys; queries↔pipeline;
// pipeline↔images; events→dispatch→queries(+pipeline/images|dab/links)→events.
// diffpreview sits in the same strongly connected component (SCC analysis)
// even though the shortest reported paths omit it.
const KNOWN_CYCLE_MODULES = new Set([
    "src/core/options.ts",
    "src/core/events.ts",
    "src/core/selection.ts",
    "src/core/shortcutkeys.ts",
    "src/api/queries.ts",
    "src/preview/pipeline.ts",
    "src/preview/images.ts",
    "src/preview/pageinfo.ts",
    "src/preview/dispatch.ts",
    "src/preview/dab.ts",
    "src/preview/diffpreview.ts",
    "src/navlinks/links.ts",
]);

export default {
    input: `${root}src/entry.ts`,
    plugins: [
        esbuild({
            // es2020 matches the repo deploy side (tsc es2020 +
            // terser ecma 2020). See docs/semantic-notes.md for the downgrade
            // consequences (class fields become constructor assignments).
            target: "es2020",
            // 类字段语义必须与迁移前产物一致（编译为构造函数中的赋值语句）：
            // 独立仓库时期的 tsconfig target es2020 使 useDefineForClassFields 默认 false；
            // 迁入本仓库后最近的 tsconfig（仓库根）target 为 ESNext，该默认值变为 true，
            // esbuild 会改用 __publicField 助手并改变运行时语义。在此显式指定，
            // 构建不再依赖 tsconfig 的查找结果。
            tsconfigRaw: {
                compilerOptions: {
                    useDefineForClassFields: false,
                },
            },
            // Type checking is done by tsc --noEmit as its own gate.
        }),
    ],
    // The rewrite has no dead code to preserve, so tree shaking is enabled.
    treeshake: true,
    // The rewrite's architecture constraint is "zero top-level side effects":
    // module bodies only define functions and constants, never evaluate a
    // cross-module binding at top level. Under that constraint function-level
    // cycles are safe at runtime (verified: the artifact evaluates cleanly in
    // jsdom with boot completing end to end), and the preview/event domains
    // are mutually recursive by nature — upstream's original design, which
    // the old port whitelisted on purpose. Forcing an acyclic graph would
    // mean registry seams across five already-locked domains with zero
    // runtime benefit. Instead, cycles confined to KNOWN_CYCLE_MODULES are
    // allowed; any cycle reaching outside the set stays fatal, so a future
    // cycle (e.g. a top-level-evaluation regression) cannot sneak in silently.
    onwarn: (warning, warn) => {
        if (warning.code === "CIRCULAR_DEPENDENCY") {
            const cycleModules = warning.message.split("Circular dependency: ")[1]?.split(" -> ") ?? [];
            // rollup 的模块 id 相对构建进程的 cwd：独立仓库时期是 "src/…"，迁入本仓库后
            // 从仓库根构建则为 "packages/<name>/src/…"——归一化后再比对白名单，两种形态都匹配
            const normalize = (id) => id.replace(/^packages\/[^/]+\//u, "");
            if (cycleModules.length > 0 && cycleModules.every((m) => KNOWN_CYCLE_MODULES.has(normalize(m)))) {
                return;
            }
        }
        warn(warning);
        throw new Error(`Unexpected rollup warning: ${warning.code ?? "UNKNOWN"}: ${warning.message}`);
    },
    output: {
        // Bare top-level statements: mw ResourceLoader wraps the script in
        // mw.loader.implement's function scope, which already isolates the
        // top-level names (see the banner note above). The entry module has
        // no imports/exports, so "es" emits a plain flat chunk.
        format: "es",
        banner,
        // 产物直接写入 src/gadgets 下的 gadget 目录（wiki 部署读取该位置），
        // 不经过包内 dist/。
        file: fileURLToPath(new URL("../../src/gadgets/Navigation_popups/Gadget-popups.js", import.meta.url)),
        // terser on the interface codes side runs with toplevel:false and
        // keep_fnames/keep_classnames; there are no exports to preserve.
    },
};
