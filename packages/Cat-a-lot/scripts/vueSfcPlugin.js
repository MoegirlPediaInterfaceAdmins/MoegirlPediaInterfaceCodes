import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { compileScript, compileTemplate, parse } from "vue/compiler-sfc";

const VUE_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*["']vue["'];?/gu;

const formatErrorMessage = (errors) => errors.map((error) => {
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object" && Reflect.has(error, "message")) {
        return `${error.message}`;
    }
    return `${error}`;
}).join("; ");

const formatVueSpecifiers = (specifiers) => specifiers
    .split(",")
    .map((specifier) => specifier.trim())
    .filter(Boolean)
    .map((specifier) => specifier.replace(/\s+as\s+/u, ": "))
    .join(", ");

const deriveId = (filename) => {
    const normalized = filename.replace(/\\/gu, "/");
    const marker = "/packages/Cat-a-lot/";
    const relative = normalized.includes(marker)
        ? normalized.slice(normalized.indexOf(marker) + 1)
        : path.basename(filename);
    return createHash("sha256").update(relative).digest("hex").slice(0, 8);
};

// 把模板编译出的 Vue helper 接到 runtime 的 Vue 上，避免打包 Vue 或残留静态 import。
const rewriteVueImports = (code, runtimeImport) => {
    let first = true;
    return code.replace(VUE_IMPORT_RE, (_, specifiers) => {
        const binding = formatVueSpecifiers(specifiers);
        const importStatement = first ? `import { Vue as __vueRuntime } from "${runtimeImport}";\n` : "";
        first = false;
        return `${importStatement}const { ${binding} } = __vueRuntime;`;
    });
};

// 只支持无样式块的普通 <script>。
const vueSfcPlugin = {
    name: "cat-a-lot-vue-sfc",
    setup: (build) => {
        build.onLoad({ filter: /\.vue$/ }, async (args) => {
            const source = await fs.readFile(args.path, "utf8");
            const { descriptor, errors } = parse(source, { filename: args.path });
            if (errors.length > 0) {
                throw new Error(`${args.path}: SFC 解析失败：${formatErrorMessage(errors)}`);
            }
            if (!descriptor.template) {
                throw new Error(`${args.path}: 缺少 <template>`);
            }
            if (descriptor.styles.length > 0) {
                throw new Error(`${args.path}: SFC 不承载 <style>，样式请放 src/index.css`);
            }
            if (!descriptor.script && !descriptor.scriptSetup) {
                throw new Error(`${args.path}: 缺少 <script>`);
            }
            const id = deriveId(args.path);
            const script = compileScript(descriptor, { id });
            const template = compileTemplate({
                source: descriptor.template.content,
                filename: args.path,
                id,
                compilerOptions: {
                    bindingMetadata: script.bindings,
                },
            });
            if (template.errors.length > 0) {
                throw new Error(`${args.path}: 模板编译失败：${formatErrorMessage(template.errors)}`);
            }
            const runtimePath = path.join(path.dirname(args.path), "runtime.ts");
            let runtimeImport = path.relative(path.dirname(args.path), runtimePath).replace(/\\/gu, "/");
            if (!runtimeImport.startsWith(".")) {
                runtimeImport = `./${runtimeImport}`;
            }
            let scriptCode = script.content.replace(/export\s+default\s+/u, "const __sfc__ = ");
            if (!/;\s*$/u.test(scriptCode)) {
                scriptCode += ";";
            }
            const templateCode = rewriteVueImports(template.code, runtimeImport);
            const contents = [
                scriptCode,
                "",
                templateCode,
                "__sfc__.render = render;",
                "export default __sfc__;",
                "",
            ].join("\n");
            return {
                contents,
                loader: "ts",
                resolveDir: path.dirname(args.path),
            };
        });
    },
};

export { vueSfcPlugin };
