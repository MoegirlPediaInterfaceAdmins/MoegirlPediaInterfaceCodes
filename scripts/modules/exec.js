import { exec } from "node:child_process";
/**
 * @param {string} cmd
 * @returns {Promise<string, string>}
 */
export default (cmd) => new Promise((res, rej) => {
    exec(cmd, {
        timeout: 0,
        // eslint-disable-next-line promise/prefer-await-to-callbacks
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
