import fs from "node:fs";
import path from "node:path";
import console, { split } from "../modules/console.js";
import testLatency from "../modules/testLatency.js";
console.info("Initialization done.");

// 指针文件：把测速选出的 registry 落盘到已 gitignore 的 .cache/（沿用本仓库指针文件惯例），
// 供 package.json 的 ci 脚本读取后传给 `npm ci --registry=<registry> --replace-registry-host=always`，
// 由 npm 在安装时把 package-lock.json 各 resolved 的 registry host 原地替换为该源。
// 全程不读取、不修改 lock 文件，因此无需备份与恢复。
const registryPointerFile = path.join(".cache", "ci-registry");

const registries = [
    "https://registry.npmjs.org/",
    "https://registry.npmmirror.com/",
];
const targetPath = "index.json";
const latency = await testLatency(registries.map((base) => `${base}${targetPath}`));
const targetRegistry = latency.sort(([, a], [, b]) => a - b)[0][0].replace(targetPath, "");
console.info("targetRegistry:", targetRegistry);
await fs.promises.mkdir(".cache", { recursive: true });
await fs.promises.writeFile(registryPointerFile, targetRegistry, "utf8");
console.info("registry pointer written:", registryPointerFile);
console.info("Done.");
split();
