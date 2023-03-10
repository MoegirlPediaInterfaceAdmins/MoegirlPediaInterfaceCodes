import fs from "fs";
import yaml from "yaml";

export const readFile = async (path) => yaml.parse(await fs.promises.readFile(path, { encoding: "utf-8" }));
export const writeFile = async (path, value) => await fs.promises.writeFile(path, `${yaml.stringify(value).replace(/(?<=\n)([^ \n])/g, "\n$1").trim()}\n`, { encoding: "utf-8" });
export default { readFile, writeFile };
