"use strict";
const base = require("./base.js");
const actions = [
    {
        name: "Auto browserify generator",
        command: "node scripts/browserify/index.js",
    },
    {
        name: "Conventional Commits scopes generator",
        command: "node scripts/conventionalCommitsScopesGenerator/index.js",
    },
    {
        name: "Auto prefetch",
        command: "node scripts/prefetch/index.js",
    },
    {
        name: "Gadgets-definition Generator",
        command: "node scripts/gadgetsDefinitionGenerator/index.js",
    },
    {
        name: "Gadget-polyfill generator",
        command: "node scripts/generatePolyfill/index.js",
    },
];
base(actions);
