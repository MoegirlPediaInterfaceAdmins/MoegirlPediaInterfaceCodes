import obfuscator from "javascript-obfuscator";

export const obfuscate = (...args) => {
    const oldCI = process.env.CI;
    process.env.CI = "true";
    try {
        return obfuscator.obfuscate(...args);
    } finally {
        // 恢复而非无条件赋值：CI 原本未设置时赋回 undefined 会被 Node 转成字符串
        // "undefined"（truthy），污染同进程后续代码与子进程的 CI 判断
        if (oldCI === undefined) {
            Reflect.deleteProperty(process.env, "CI");
        } else {
            process.env.CI = oldCI;
        }
    }
};
