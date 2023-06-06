import path from "path";
import fs from "fs";
/**
 * @param {string} p 
 * @param {boolean} [removePrefix]
 * @returns {Promise<string[]>}
 */
const readDir = async (p, removePrefix = false) => {
    const result = await Promise.all((await Promise.all((await fs.promises.readdir(p, { withFileTypes: true })).map((dirent) => path.join(p, dirent.name)).map(async (n) => [n, await fs.promises.stat(n)]))).filter(([, stat]) => stat.isFile() || stat.isDirectory()).map(async ([n, stat]) => stat.isFile() ? removePrefix ? n.replace(`${p}/`, "") : n : await readDir(path.join(n), removePrefix)));
    return result.flat(999);
};
export default readDir;
