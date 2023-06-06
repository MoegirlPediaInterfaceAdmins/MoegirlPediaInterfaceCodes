import { simpleGit } from "simple-git";

export const git = simpleGit({ baseDir: process.cwd() });
export default git;
