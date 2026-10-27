/**
 * QuickRequest 自有入口的挂载器列表（权限变更版「申请/辞职」按钮、封禁申诉入口、删除请求入口等）。
 * 阶段 1 没有自有入口——edit / pageInfo 经 window.libQuickRequest 调起，列表为空；
 * 阶段 2 起按里程碑在此追加各入口的 availability 判断与挂载函数。
 */
const entryMounters: (() => void)[] = [];

/**
 * 挂载全部自有入口。index 在模块求值时调用一次。
 */
const mountEntries = (): void => {
    for (const mount of entryMounters) {
        mount();
    }
};

export { mountEntries };
