"use strict";
const child_process = require("child_process");
/**
 * @param {string} cmd 
 * @returns {Promise<string, string>}
 */
module.exports = (cmd) => new Promise((res, rej) => {
    child_process.exec(cmd, {
        timeout: 0,
    }, (error, stdout, stderr) => {
        if (!error) {
            res(stdout.trim());
        } else {
            rej({
                error, stdout: stdout.trim(), stderr: stderr.trim(),
            });
        }
    });
});