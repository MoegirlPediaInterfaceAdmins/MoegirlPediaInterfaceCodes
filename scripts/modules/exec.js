import { exec } from "node:child_process";
/**
 * @param {string} cmd
 * @returns {Promise<string, Error>} 失败时 reject 的 Error 附带 exitCode（子进程退出码）、
 * error（底层 Node 错误）与 trim 后的 stdout / stderr，约定与 spawnAsync 一致
 */
export default (cmd) => new Promise((res, rej) => {
    exec(cmd, {
        timeout: 0,
        // eslint-disable-next-line promise/prefer-await-to-callbacks
    }, (error, stdout, stderr) => {
        if (!error) {
            res(stdout.trim());
        } else {
            // reject Error 而非裸对象：调用方 catch 后可直接拿到 message/stack，
            // 退出码挂在 exitCode 上，不必下钻 error.code 两层才能取到
            rej(Object.assign(new Error(`${cmd} exited with code ${error.code}`), {
                error,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: error.code,
            }));
        }
    });
});
