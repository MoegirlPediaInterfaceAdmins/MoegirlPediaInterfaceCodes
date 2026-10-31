// vitest setupFiles：先于每个测试文件的全部 import 执行。
// src 模块按「顶层零副作用」设计，但 i18n 翻译表在顶层求值时调用站点
// 提供的 wgULS，因此站点全局必须在任何 src 模块被 import 前装好。
import jquery from "jquery";
import { afterAll, vi } from "vitest";

// 简体直通（zh 站默认变体）；需要断言繁体/地域变体的用例可局部覆盖。
// Object.assign 绕开 ambient declare const 的只读约束，且避免 any 收窄。
Object.assign(globalThis, {
    wgULS: (cn: string): string => cn,
    $: jquery,
});

// 透明记录真定时器：下方排空 hook 只能让单发定时器触发完毕，而槽缺失
// 重试链（htmlout.ts 的 setPopupHTML 600ms，每次触发再挂下一发）在排空
// 窗口结束后仍存活，jsdom 环境随测试文件拆除后触发即 ReferenceError:
// document is not defined，被 vitest 计为 Unhandled Error 直接红构建
// （首例：CI run 4804/PR #1160——pipeline.test.ts 无槽 div 用例遗留的
// 重试链撞上环境拆除）。排空后清除仍挂起的定时器，在环境拆除前把自我
// 续期链确定性终结。vi.useFakeTimers 的用例不受影响：假定时器整体替换
// 全局 setTimeout，绕过本包装、由 vitest 自管；useRealTimers 恢复回来
// 的就是本包装。
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
const originalSetTimeout = globalThis.setTimeout;
const realSetTimeout = originalSetTimeout.bind(globalThis);
// Object.assign 连同原实现的 own 属性一起接管（util.promisify(setTimeout)
// 依赖的 __promisify__；bind 会丢掉 own 属性，故必须从原函数复制）
globalThis.setTimeout = Object.assign((...args: Parameters<typeof setTimeout>): ReturnType<typeof setTimeout> => {
    const id = realSetTimeout(...args);
    pendingTimeouts.add(id);
    return id;
}, originalSetTimeout);

// 文件级收尾：排空 src 侧火后不理的真定时器（popTipsSoonFn 250ms、
// setPopupHTML 的位置检查 100ms 与槽缺失重试 600ms）。jsdom 环境随测试
// 文件拆除，晚到的回调会访问已被撤销的 document 全局，被 vitest 计为
// Unhandled Error 直接红构建（首例：CI run 36302494044——最后一个用例
// 渲染完预览后，previewmaker 路径挂的 250ms popTips 撞上环境拆除；
// 仅 boot 真身装配的文件暴露，因 tooltipScanner 未注册时 popTips 为空跑）。
// 650ms 覆盖最长单发延时；生产环境页面常驻、同类定时器无泄漏问题，此
// 排空纯属测试侧收尾。setup 文件注册的 hook 对每个测试文件各生效一次
// （vitest 文档：setup 文件可注册跨用例 hook）。先切回真定时器再睡：
// 本 hook 自身的计时依赖真定时器，防前面用例遗留假定时器把它挂死。
// 睡醒后再清除仍挂起的定时器：自我续期链（600ms 重试）睡不空，见上。
afterAll(async () => {
    vi.useRealTimers();
    await new Promise((resolve) => {
        setTimeout(resolve, 650);
    });
    for (const id of pendingTimeouts) {
        clearTimeout(id);
    }
    pendingTimeouts.clear();
});
