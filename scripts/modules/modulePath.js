import path from "path";
import { fileURLToPath } from "url";

/**
 * @param {ImportMeta} meta
 */
export default (meta) => path.relative(process.cwd(), fileURLToPath(meta.url));
