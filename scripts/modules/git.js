import console from "../modules/console.js";
import { simpleGit } from "simple-git";
import { error } from "@actions/core";

export const git = simpleGit({ baseDir: process.cwd() });
export const log = (err, data) => (err ? error : console.info)(data);
export default { git, log };
