import console from "../modules/console.js";
import { simpleGit } from "simple-git";
import { error } from "@actions/core";

export const git = simpleGit({ baseDir: process.cwd() });
export function log(err, data) { return (err ? error : console.info)(data); }
