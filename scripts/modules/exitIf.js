import console from "./console.js";

/**
 * 条件成立时打印消息并以退出码 0 结束进程，用于脚本入口与流程中的环境守卫。
 * @param {boolean} condition
 * @param {string} message
 */
export default (condition, message) => {
    if (condition) {
        console.info(message);
        process.exit(0);
    }
};
