import obfuscator from "javascript-obfuscator";

export const obfuscate = (...args) => {
    const oldCI = process.env.CI;
    process.env.CI = "true";
    const result = obfuscator.obfuscate(...args);
    process.env.CI = oldCI;
    return result;
};
