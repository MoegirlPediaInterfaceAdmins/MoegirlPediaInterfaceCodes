// eslint-disable-next-line strict
"use strict";
const isInGithubActions = process.env.GITHUB_ACTIONS === "true";
const path = require("path");
const { debug, notice, warning, error } = require("@actions/core");
const deprecatedRules = [];
/**
 * @type { import("eslint").ESLint.Formatter["format"] }
 */
const formatter = (results) => {
    if (results.length === 0) {
        return "Nothing is broken, everything is fine.";
    }
    for (const {
        filePath, messages, usedDeprecatedRules,
        // eslint-disable-next-line no-unused-vars
        suppressedMessages, errorCount, fatalErrorCount, warningCount, fixableErrorCount, fixableWarningCount, output, source,
    } of results) {
        const baseAnnotationProperties = {
            title: "ESLint Annotation",
            file: filePath,
        };
        for (const { ruleId, replacedBy } of usedDeprecatedRules) {
            if (deprecatedRules.includes(ruleId)) {
                continue;
            }
            deprecatedRules.push(ruleId);
            // @TODO: Switch to `warning` when eslint 9 is released
            debug(`Deprecated rule: ${ruleId}. ${replacedBy.length > 0 ? `Please use ${replacedBy.join(" / ")} instead.` : ""} - https://eslint.org/docs/latest/rules/${ruleId}`, baseAnnotationProperties);
        }
        for (const {
            message, severity, line, column, endLine, endColumn, ruleId, fix,
            // eslint-disable-next-line no-unused-vars
            messageId, nodeType, fatal, source, suggestions,
        } of messages) {
            const msg = `${message} (${ruleId}) ${fix ? "[maybe fixable]" : ""} - https://eslint.org/docs/latest/rules/${ruleId}${isInGithubActions ? ` @ https://github.com/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_SHAs.slice(0, 7)}/${path.relative(process.cwd(), filePath)}#L${line}${line !== endLine ? `-L${endLine}` : ""}` : ""}`;
            /**
             * @type {NonNullable<Parameters<notice>[1]>}
             */
            const annotationProperties = {
                ...baseAnnotationProperties,
                startLine: line,
                endLine,
                startColumn: column,
                endColumn,
            };
            debug(JSON.stringify({ msg, ...annotationProperties }, null, 4));
            switch (severity) {
                case 0:
                    notice(msg, annotationProperties);
                    break;
                case 1:
                    warning(msg, annotationProperties);
                    break;
                case 2:
                    error(msg, annotationProperties);
                    break;
                default:
                    break;
            }
        }
    }
    return "";
};
module.exports = formatter;
