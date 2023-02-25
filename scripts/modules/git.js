"use strict";
const console = require("../modules/console.js");
const { simpleGit } = require("simple-git");
const core = require("@actions/core");

module.exports = {
    git: simpleGit({ baseDir: process.cwd() }),
    log: (err, data) => (err ? core.error : console.info)(data),
};
