import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.argv[2] || path.resolve(scriptDir, "../..");
const packageJsonPath = path.join(repoRoot, "package.json");
const hookEventName = "PreToolUse";

const emit = (output, exitCode = 0) => {
    process.stdout.write(`${JSON.stringify(output)}\n`);
    process.exit(exitCode);
};

const createOutput = ({ continueFlag, stopReason, additionalContext, systemMessage }) => {
    const output = {
        "continue": continueFlag,
        hookSpecificOutput: {
            hookEventName,
            additionalContext,
        },
    };
    if (continueFlag === false) {
        output.stopReason = stopReason || "No reason provided";
    }

    if (systemMessage) {
        output.systemMessage = systemMessage;
    }

    return output;
};

const readPackageJson = async () => JSON.parse(await readFile(packageJsonPath, "utf8"));

const fetchText = async (url, label) => {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${label}: ${response.status} ${response.statusText}`);
    }

    return {
        text: await response.text(),
        url: response.url,
    };
};

const resolveSemverSource = async (packageJson) => {
    try {
        const semverModule = await import("semver");
        return {
            source: "local",
            semver: semverModule.default ?? semverModule,
        };
    } catch (error) {
        if (!["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"].includes(error?.code)) {
            throw error;
        }
    }

    const semverSpec = packageJson.dependencies?.semver || packageJson.devDependencies?.semver || "latest";
    const bundleUrl = `https://cdn.jsdelivr.net/npm/semver@${encodeURIComponent(semverSpec)}/+esm`;
    const cacheDir = path.join(repoRoot, ".cache");
    const cacheFileName = new URL(bundleUrl).pathname.replace(/[^a-zA-Z0-9_-]+/g, "_");
    const cacheFilePath = path.join(cacheDir, `${cacheFileName || "semver_bundle"}.mjs`);

    await mkdir(cacheDir, { recursive: true });

    for (const forceRefresh of [false, true]) {
        if (forceRefresh) {
            await rm(cacheFilePath, { force: true });
        }

        try {
            await access(cacheFilePath);
        } catch {
            await writeFile(cacheFilePath, (await fetchText(bundleUrl, "semver bundle")).text);
        }

        try {
            const semverModule = await import(`${pathToFileURL(cacheFilePath).href}?t=${Date.now()}`);
            return {
                source: `remote:${bundleUrl}`,
                semver: semverModule.default ?? semverModule,
            };
        } catch (error) {
            if (forceRefresh) {
                await rm(cacheFilePath, { force: true });
                throw error;
            }
        }
    }
};

try {
    const packageJson = await readPackageJson();
    const requiredRange = packageJson.engines?.node;

    if (!requiredRange) {
        emit(createOutput({ continueFlag: true, additionalContext: `Node.js version: ${process.version}; package.json has no engines.node requirement` }));
    }

    let semverContext;
    try {
        semverContext = await resolveSemverSource(packageJson);
    } catch (error) {
        emit(createOutput({
            continueFlag: true,
            additionalContext: `Node.js version: ${process.version}; package.json engines.node: ${requiredRange}; semver source: unavailable`,
            systemMessage: `未能加载 semver，无法校验 package.json 中的 engines.node 要求 ${requiredRange}。${error.message}`,
        }));
    }

    const additionalContext = `Node.js version: ${process.version}; package.json engines.node: ${requiredRange}; semver source: ${semverContext.source}`;
    const isSatisfied = !!semverContext.semver.satisfies(process.version, requiredRange);

    if (!isSatisfied) {
        emit(createOutput({
            continueFlag: false,
            additionalContext,
            stopReason: `Node.js version ${process.version} does not satisfy the requirement ${requiredRange}`,
            systemMessage: `当前 Node.js 版本 ${process.version} 不满足 package.json 中的要求 ${requiredRange}。请切换到符合要求的版本后再继续。`,
        }));
    }

    emit(createOutput({ continueFlag: true, additionalContext }));
} catch (error) {
    emit(createOutput({ continueFlag: false, additionalContext: `Node.js version: ${process.version}; Error: ${error.message}`, stopReason: `Error occurred: ${error.message}` }));
}
