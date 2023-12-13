// eslint-disable-next-line strict
"use strict";
const { startGroup, endGroup } = require("@actions/core");
// eslint-disable-next-line no-unused-vars
const { ESLint } = require("eslint");
const severities = {
    0: "debug",
    1: "warning",
    2: "error",
};
/**
 * @type {ESLint.Formatter['format']}
 */
const formatter = (results) => {
    if (results.length !== 0) {
        startGroup("ESLint Annotations");
        const result = [];
        for (const { filePath, messages } of results) {
            for (const { message, severity, line, column, endLine, endColumn, ruleId, fix } of messages) {
                result.push(`::${severities[severity]} file=${filePath},line=${line},col=${column},endLine=${endLine},endColumn=${endColumn},title=ESLint problem::${message} (${ruleId}) ${fix ? "[maybe fixable]" : ""} - https://eslint.org/docs/latest/rules/${ruleId}`);
            }
        }
        console.info(result.join("\n"));
        endGroup();
    }
    return "";
};
module.exports = formatter;
