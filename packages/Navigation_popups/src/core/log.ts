// 调试日志门：legacy globals.ts 语义照搬——仅 window.popupDebug 为真时
// 输出到 console。popupDebugging / popupLocalDebug 是其余用点（actions 的
// 调试弹窗、init 的本地调试站点）读取的旗标，与这两个函数无关。

export const log = (...args: unknown[]): void => {
    if (window.popupDebug) {
        console.log(...args);
    }
};

export const errlog = (...args: unknown[]): void => {
    if (window.popupDebug) {
        console.error(...args);
    }
};
