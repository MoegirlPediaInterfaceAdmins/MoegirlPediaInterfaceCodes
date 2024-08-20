import path from "node:path";
import fs from "node:fs";
/**
 * @param {string} p
 * @param {boolean} [removePrefix]
 * @returns {Promise<string[]>}
 */
const readDir = async (p, removePrefix = false) => (await fs.promises.readdir(p, { recursive: true })).map((n) => removePrefix ? n : path.join(p, n));
export default readDir;
