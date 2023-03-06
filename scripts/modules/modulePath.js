import path from "path";
/**
 * @param {ImportMeta} meta
 */
export default (meta) => path.relative(process.cwd(), new URL(meta.url).pathname);
