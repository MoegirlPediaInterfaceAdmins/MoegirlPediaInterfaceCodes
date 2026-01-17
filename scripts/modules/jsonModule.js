import fs from "node:fs";

/**
 * @param { fs.PathLike | fs.promises.FileHandle } path
 * @param { "json" | "jsonc" } [type="json"]
 */
export const readFile = async (path, type = "json") => {
    const content = await fs.promises.readFile(path, { encoding: "utf-8" });
    if (type === "jsonc") {
        return (await import("jsonc-parser")).parse(content);
    }
    return JSON.parse(content);
};
/**
 * @param { fs.PathLike | fs.promises.FileHandle } path
 * @param { any } value
 * @param { string | number | undefined } space
 */
export const writeFile = async (path, value, space = 4) => await fs.promises.writeFile(path, `${JSON.stringify(value, null, space)}\n`, { encoding: "utf-8" });
export default { readFile, writeFile };
