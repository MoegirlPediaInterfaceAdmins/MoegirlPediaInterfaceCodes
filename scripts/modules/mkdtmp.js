import console from "../modules/console.js";
import { randomUUID } from "crypto";
import fs from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * @param { { local?: boolean, random?: boolean, subDir?: string } } [options]
 */
export default async (options = {}) => {
    const local = typeof options.local === "boolean" ? options.local : false;
    const random = typeof options.random === "boolean" ? options.random : true;
    const subDir = typeof options.subDir === "string" ? options.subDir : random ? randomUUID() : "MoegirlPediaInterfaceCodes";
    const tempPath = join(local ? ".tmp" : process.env.RUNNER_TEMP || tmpdir(), subDir);
    console.log("tempPath:", tempPath);
    await fs.promises.mkdir(tempPath, {
        recursive: true,
    });
    return tempPath;
};
