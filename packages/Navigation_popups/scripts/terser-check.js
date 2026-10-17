// Replicates the interface codes deploy chain against the bundled artifact:
//   1) tsc -p tsconfig.production.json — target es2020 with emit (outDir
//      dist/_compiled), exactly what the deploy side compiles with;
//   2) terser on the *emitted* file (options copied from MoegirlPediaInterfaceCodes
//      scripts/minification/options.js).
// Running terser on the tsc output (not the raw bundle) matters: it proves the
// artifact survives the real deploy order. Both outputs are discarded; this is
// a parse/compress smoke gate.
/* eslint-disable camelcase -- terser options use snake_case */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";
import { minify } from "terser";

const options = {
    ecma: 2020,
    compress: {
        arrows: true,
        arguments: true,
        booleans: true,
        booleans_as_integers: false,
        collapse_vars: true,
        comparisons: true,
        computed_props: true,
        conditionals: true,
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        ecma: 2020,
        evaluate: true,
        expression: false,
        global_defs: {},
        hoist_funs: true,
        hoist_props: true,
        hoist_vars: false,
        if_return: true,
        inline: true,
        join_vars: true,
        keep_classnames: true,
        keep_fargs: true,
        keep_fnames: true,
        keep_infinity: true,
        lhs_constants: true,
        loops: true,
        module: false,
        negate_iife: true,
        passes: 3,
        properties: true,
        pure_funcs: [],
        pure_getters: "strict",
        pure_new: false,
        reduce_vars: true,
        reduce_funcs: true,
        sequences: true,
        side_effects: true,
        switches: true,
        toplevel: false,
        top_retain: null,
        typeofs: true,
        unsafe: false,
        unused: true,
    },
    mangle: {
        eval: false,
        keep_classnames: true,
        keep_fnames: true,
        module: false,
        properties: {
            builtins: false,
            keep_quoted: false,
            undeclared: false,
            regex: /^$/,
        },
    },
    format: {
        ascii_only: false,
        beautify: false,
        braces: false,
        comments: "some",
        ecma: 2020,
        indent_level: 4,
        indent_start: 0,
        inline_script: true,
        keep_numbers: false,
        keep_quoted_props: false,
        max_line_len: 1024 * 10,
        preamble: null,
        quote_keys: false,
        quote_style: 0,
        preserve_annotations: false,
        safari10: false,
        semicolons: true,
        shebang: false,
    },
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..", "..");
const execFileAsync = promisify(execFile);

// Gate 1 — the raw bundle must be es2020-clean on its own. Neither tsc
// (target es2020 emit silently DOWNGRADES leaked es2021+ syntax: `??=`,
// class fields…) nor terser (its parser accepts modern syntax regardless of
// the ecma output option) rejects such leaks, so the deploy chain below would
// pass even on a mis-targeted build. acorn with ecmaVersion 2020 is the
// precise boundary: it fails to parse exactly the es2021+ grammar.
const rawArtifact = path.join(repoRoot, "src", "gadgets", "Navigation_popups", "Gadget-popups.js");
const rawCode = await fs.promises.readFile(rawArtifact, "utf8");
try {
    parse(rawCode, { ecmaVersion: 2020 });
} catch (error) {
    throw new Error(`raw artifact is not valid es2020 (es2021+ syntax leaked into the bundle — check the esbuild target in rollup.config.js): ${error.message}`, { cause: error });
}

// Gate 2 — the deploy-order equivalence chain: tsc es2020 emit (as the repo
// deploy side does via the root tsconfig.production.json over src/), then the
// deploy-terser pass on the EMITTED file (not the raw bundle). Emit shape is
// determined by target/module alone, so the gate invokes the repo's tsc with
// equivalent CLI flags on the artifact only — compiling the whole repo here
// would just duplicate `npm run build:js`. The temp directory is removed
// afterwards: it is a gate-only intermediate, never committed or shipped.
const tscBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
const gateDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "popups-terser-gate-"));
// --ignoreConfig：TS 6.0 起 CLI 指定文件时若存在 tsconfig 会报 TS5112，而这个门禁不需要加载任何工程配置
await execFileAsync(tscBin, ["--ignoreConfig", "--allowJs", "--target", "es2020", "--module", "preserve", "--outDir", gateDir, rawArtifact]);
const artifact = path.join(gateDir, "Gadget-popups.js");
let code;
try {
    code = await fs.promises.readFile(artifact, "utf8");
    const result = await minify(code, options);
    if (typeof result.code !== "string" || result.code.length === 0) {
        throw new Error("terser returned empty output");
    }
    console.log(`es2020 parse gate OK (${Buffer.byteLength(rawCode, "utf8")} bytes); tsc-es2020 + terser OK: ${Buffer.byteLength(code, "utf8")} -> ${Buffer.byteLength(result.code, "utf8")} bytes (output discarded)`);
} finally {
    await fs.promises.rm(gateDir, { recursive: true, force: true });
}
