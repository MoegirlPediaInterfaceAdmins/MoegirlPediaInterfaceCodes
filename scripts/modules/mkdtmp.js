import console from "../modules/console.js";
import { randomUUID } from "crypto";
import fs from "fs";
import { tmpdir } from "os";
import { join } from "path";

export default async (local = false) => {
    const tempPath = join(local ? ".tmp" : process.env.RUNNER_TEMP || tmpdir(), randomUUID());
    console.log("tempPath:", tempPath);
    await fs.promises.mkdir(tempPath, {
        recursive: true,
    });
    return tempPath;
};
