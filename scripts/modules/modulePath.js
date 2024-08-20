import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {ImportMeta} meta
 */
export default (meta) => path.relative(process.cwd(), fileURLToPath(meta.url));
