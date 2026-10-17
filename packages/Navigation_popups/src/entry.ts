// 入口：本仓库中唯一允许注册全局副作用的模块。
//
// 双载入守卫沿用原版语义：window.pg 已存在且不是元素节点时，说明另一份
// 实例已在运行（mw.loader 正常不会双载入，但用户脚本手动引入时可能发生），
// 本份保持静默退出。
//
// 与原版（模块求值期展开全部定义与初始化）不同，重写版的所有初始化都
// 经由 boot() 在 ready/load 回调中显式执行——模块顶层零副作用是本仓库
// 的架构约束，也是测试可以直接 import 各模块的前提。
//
// window.pg 的装配不能推迟到 boot()：boot 在 ready 之后才运行，若标记
// 晚于守卫检查，ready 前的窗口期内另一份实例会通过守卫造成双载入，
// 因此守卫通过后立即同步标记。
//
// ready 回调内与 boot 调度并列的 hook 装配段对应 legacy entry.ts:47-87 的
// 同层 IIFE：MediaWiki 的站内导航、编辑预览与 Echo 浮层都会经
// wikipage.content / ext.echo.overlay.beforeShowingOverlay 注入新 DOM，
// 本段为这些内容补挂 tooltip 监听，并给可见弹窗续上位置守卫（否则整页
// 换页后已经展开的弹窗再也没人盯着鼠标离没离开）。
import { boot, setupPopups } from "./boot.ts";
import { eventsState, posCheckerHook, setupTooltips } from "./core/events.ts";
import { Navpopup } from "./core/popup.ts";
import { state } from "./state.ts";

const alreadyLoaded = !!window.pg && !(window.pg instanceof HTMLElement);

if (!alreadyLoaded) {
    window.pg = state;
    $(() => {
        if (document.readyState === "complete") {
            boot();
        } else {
            $(window).on("load", () => {
                boot();
            });
        }
        // —— 动态内容重扫（legacy 同名 IIFE 的等价物）——
        // once 只拦 id=mw-content-text 的首次触发：ready 时初始的
        // setupTooltips 已扫过正文（MediaWiki 首帧也会在 wikipage.content
        // 上重放同一段正文），这次重扫纯属白跑；非 mw-content-text 的内容
        // 不受 once 影响，once 用尽后正文的后续触发照常处理。
        let once = true;
        const dynamicContentHandler = ($content: JQuery<Element>): void => {
            if ($content.attr("id") === "mw-content-text") {
                if (once) {
                    once = false;
                    return;
                }
            }
            const registerHooksForVisibleNavpops = (): void => {
                // eventsState.current.links 恒为数组（legacy 的 pg.current.links
                // 是动态域，原文 `links &&` 的未定义防御在重写版无对应分支）
                for (const link of eventsState.current.links) {
                    const navpop = link.navpopup;
                    if (!navpop?.isVisible()) {
                        continue;
                    }
                    Navpopup.tracker.addHook(posCheckerHook(navpop));
                }
            };
            const doIt = (): void => {
                registerHooksForVisibleNavpops();
                // 复位容器标记再重扫：该容器可能在上次扫描后又长出新链接
                $content.each(function (this: Element): void {
                    this.ranSetupTooltipsAlready = false;
                    setupTooltips(this);
                });
            };
            // fire-and-forget（legacy 同款）：初始化未完成时 doIt 在
            // setupPopups 序列末尾回调，此后立即同步执行
            void setupPopups(doIt);
        };
        // ready 时既有的 .mw-parser-output 元素逐个立即处理一次（首个自身
        // 带 id=mw-content-text 的元素会吃掉 once，与 legacy 一致）
        document.querySelectorAll(".mw-parser-output").forEach((content) => {
            dynamicContentHandler($(content));
        });
        mw.hook("wikipage.content").add(dynamicContentHandler);
        mw.hook("ext.echo.overlay.beforeShowingOverlay").add(($overlay: JQuery<Element>): void => {
            dynamicContentHandler($overlay.find(".mw-echo-state"));
        });
    });
}
