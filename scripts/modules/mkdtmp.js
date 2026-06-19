import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import console from "../modules/console.js";

// 跨进程复用由调用方经指针文件桥接（见 scripts/ci/before.js / after.js），
// 本函数只负责在 $RUNNER_TEMP（CI）或 os.tmpdir()（本地）下原子创建一个随机临时目录。
// 使用 fs.mkdtemp（O_EXCL 独占创建）而非 mkdir({recursive})：
// 前者原子且文件名随机，杜绝固定名/竞态引发的覆盖与 insecure-temporary-file 隐患。
export default async () => {
    const root = process.env.RUNNER_TEMP || os.tmpdir();
    const tempPath = await fs.promises.mkdtemp(path.join(root, "mgp-"));
    console.log("tempPath:", tempPath);
    return tempPath;
};
