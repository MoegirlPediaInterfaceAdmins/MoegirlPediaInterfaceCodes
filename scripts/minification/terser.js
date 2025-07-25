import fs from "node:fs";
import path from "node:path";
import prettyBytes from "pretty-bytes";
import { minify } from "terser";
import console from "../modules/console.js";
console.info("Initialization done.");

const compiledFolder = "dist/_compiled";
const minifiedFolder = "dist/_minified";

/**
 * @type { import("terser").MinifyOptions }
 */
const options = {
    /* eslint-disable camelcase -- Terser options use snake_case */
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
        max_line_len: false,
        preamble: null,
        quote_keys: false,
        quote_style: 0,
        preserve_annotations: false,
        safari10: false,
        semicolons: true,
        shebang: false,
    },
    /* eslint-enable camelcase */
};

console.info("Minifying JavaScript files...");
console.info(`Compiled folder: ${compiledFolder}`);
console.info(`Minified folder: ${minifiedFolder}`);
console.info("Terser options:", options);

await fs.promises.rm(minifiedFolder, { recursive: true, force: true });
const files = (await fs.promises.readdir(compiledFolder, {
    recursive: true,
    withFileTypes: true,
})).filter((file) => file.isFile() && path.extname(file.name) === ".js");
for (const { parentPath, name } of files) {
    const filePath = path.join(parentPath, name);
    const minifiedFilePath = path.join(minifiedFolder, path.relative(compiledFolder, filePath));
    console.info(`\tMinifying file: ${filePath} -> ${minifiedFilePath}`);
    try {
        const code = await fs.promises.readFile(filePath, { encoding: "utf-8" });
        const result = await minify(code, options);
        await fs.promises.mkdir(path.dirname(minifiedFilePath), { recursive: true });
        await fs.promises.writeFile(minifiedFilePath, result.code, { encoding: "utf-8" });
        console.info(`\t\tSuccessfully minified, size reduced from ${prettyBytes(Buffer.byteLength(code, "utf-8"), { binary: true })} to ${prettyBytes(Buffer.byteLength(result.code, "utf-8"), { binary: true })}.`);
    } catch (error) {
        console.error(`\t\tError minifying file ${filePath}:`, error);
    }
}
console.info("JavaScript minification completed.");
