import fs from "fs";

export const readFile = async (path) => JSON.parse(await fs.promises.readFile(path, { encoding: "utf-8" }));
export const writeFile = async (path, value) => await fs.promises.writeFile(path, `${JSON.stringify(value, null, 4)}\n`, { encoding: "utf-8" });
export default { readFile, writeFile };
