"use strict";
const base = require("./base.js");
const actions = [
    {
        name: "Check eslint environment",
        command: "npx eslint --env-info && ls -lhA .cache",
    },
    {
        name: "Run eslint",
        command: 'npx eslint --exit-on-fatal-error --max-warnings 0 --cache --cache-strategy content --cache-location ".cache/" --ext js ./src',
    },
    {
        name: "Run stylelint",
        command: 'npx stylelint --max-warnings 0 --cache --cache-location ".cache/" "src/**/*.css"',
    },
    {
        name: "Run v8r",
        command: "npx -y v8r@latest src/**/definition.json --schema .vscode/json-schemas/gadget-definition.json",
    },
];
base(actions);
