import fs from "fs";

/**
 * @param {fs.PathLike | fs.promises.FileHandle} path 
 * @returns 
 */
export const readFile = async (path) => JSON.parse(await fs.promises.readFile(path, { encoding: "utf-8" }));
/**
 * @param {fs.PathLike | fs.promises.FileHandle} path 
 * @param {any} value 
 * @param {string | number | undefined} space 
 * @returns 
 */
export const writeFile = async (path, value, space = 4) => await fs.promises.writeFile(path, `${JSON.stringify(value, null, space)}\n`, { encoding: "utf-8" });
export default { readFile, writeFile };
