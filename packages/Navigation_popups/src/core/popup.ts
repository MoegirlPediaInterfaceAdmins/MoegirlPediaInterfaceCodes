// 弹窗本体域：Navpopup 类——div.navpopup 生命周期、hooks 系统、定位与
// 层级、显示/隐藏/banish、静止检测（showSoonIfStable）、下载中止集合。
// 行为基准 = legacy navpopup.ts（commit 02c8dec）。
// downloads 只约定最小中止接口 { abort() }：阶段 2 的 downloader 域把在途
// 下载注册进集合，hide/banish 时逐个中止并清空（banish 经 hide 生效）。
import { log } from "./log.ts";
import { Drag } from "./drag.ts";
import { Mousetracker } from "./mousetracker.ts";
import type { Title } from "../title/title.ts";

// 在途下载的最小中止接口：具体 Downloader（阶段 2 net 域）实现之
export interface AbortableDownload {
    abort(): void;
}

// hook 以弹窗实例为 this 调用；返回真值表示请求注销自身
export type PopupHookFn = (this: Navpopup) => unknown;

interface HookEntry {
    hook: PopupHookFn;
    when: string;
    hookId: string | null;
}

// 主 div 的扩展面：navpopup 反向引用是“从 DOM 侧取回弹窗对象”的上游惯例
type NavpopupDiv = HTMLDivElement & { navpopup?: Navpopup };

export class Navpopup {
    static uid = 0;
    // 1000：起始 z-index，高于普通页面内容；每次置顶自增
    static highest = 1e3;
    // 纯状态构造（Mousetracker 构造不碰 DOM），符合「模块顶层零副作用」
    // 对静态初始化的豁免；对 document.onmousemove 的接管只在 enable() 后
    static tracker = new Mousetracker();
    uid = Navpopup.uid++;
    visible = false;
    noshow = false;
    hooks: Record<string, undefined | (HookEntry | null)[]> = {
        create: [],
        unhide: [],
        hide: [],
    };
    hookIds: Record<string, boolean> = {};
    downloads: Set<AbortableDownload> = new Set<AbortableDownload>();
    // 静止检测的上一稳定点；引导值 -1e4 保证首轮必判为“未静止”
    stable_x = 0;
    stable_y = 0;
    // ReturnType 形式兼容 DOM（number）与 Node（Timeout）两套定时器类型环境
    showSoonStableTimer?: ReturnType<typeof setInterval>;
    className?: string;
    // 以下字段由 events/actions 等外域装配（legacy 同款分工）：
    // pending=下载记账、idNumber=跨弹窗编号（把手 id/预览槽位用）、
    // parentAnchor/mouseLeavingTime/stopPopupTimer=mouseout 域隐藏流
    pending: number | null = null;
    fuzz = 5;
    constrained = true;
    width = 0;
    height = 0;
    mainDiv!: HTMLDivElement;
    left?: number;
    top?: number;
    tooWide?: boolean;
    maxWidth?: number;
    // 预览管线装配的条目态（legacy navpopup.ts 39-40）：article=当前条目
    // （重定向跟随时被 loadPreviewFromRedir 换成目标）、originalArticle=首次
    // loadPreview 时的原始条目。类型层比 legacy 多并一个 null：events 域的
    // 模块增广（events.ts 的 declare module）已把该字段冻结为 Title | null，
    // 接口合并要求两侧同型（运行时无人赋 null，行为与 legacy 一致）
    article?: Title | null;
    originalArticle?: Title;
    idNumber?: number;
    parentAnchor?: HTMLAnchorElement | null;
    mouseLeavingTime?: number | null;
    // ReturnType 形式兼容 DOM（number）与 Node（Timeout）两套定时器类型环境
    stopPopupTimer?: ReturnType<typeof setInterval>;
    // redirect-following state driven by preview pipeline（legacy 注释同义）：
    // redir=已跟随重定向次数、redirTarget=跟随后的目标——由 pipeline 域的
    // loadPreviewFromRedir 驱动
    redir = 0;
    redirTarget?: Title;

    constructor() {
        this.createMainDiv();
    }

    isVisible() {
        return this.visible;
    }

    reposition(x?: number | null, y?: number | null, noLimitHor?: boolean) {
        log(`reposition(${String(x)},${String(y)},${String(noLimitHor)})`);
        // null/undefined 表示该轴保持原值
        if (typeof x !== "undefined" && x !== null) {
            this.left = x;
        }
        if (typeof y !== "undefined" && y !== null) {
            this.top = y;
        }
        if (typeof this.left !== "undefined" && typeof this.top !== "undefined") {
            this.mainDiv.style.left = `${this.left}px`;
            this.mainDiv.style.top = `${this.top}px`;
        }
        if (!noLimitHor) {
            this.limitHorizontalPosition();
        }
    }

    limitHorizontalPosition() {
        if (!this.constrained || this.tooWide) {
            return;
        }
        this.updateDimensions();
        const x = this.left ?? Number.NaN;
        const w = this.width;
        const cWidth = document.body.clientWidth;
        // 第二条件：内容尚未撑到 maxWidth 的“高瘦”弹窗提前收窄，
        // 避免继续右移后撞出视口（maxWidth 经前置真值判断已非空）
        if (x + w >= cWidth || x > 0 && this.maxWidth && this.width < this.maxWidth && this.height > this.width && x > cWidth - this.maxWidth) {
            // 先移出屏幕（-10000px）并钉上 maxWidth 再量自然宽度：留在屏内
            // 量到的是已受视口右缘挤压后的宽度（上游测宽技巧）
            this.mainDiv.style.left = "-10000px";
            this.mainDiv.style.width = `${String(this.maxWidth)}px`;
            const naturalWidth = parseInt(String(this.mainDiv.offsetWidth), 10);
            let newLeft = cWidth - naturalWidth - 1;
            if (newLeft < 0) {
                newLeft = 0;
                // 一次性豁免：视口本身容不下弹窗，此后不再做水平限制
                this.tooWide = true;
            }
            log(`limitHorizontalPosition: moving to (${newLeft},${String(this.top)}); naturalWidth=${naturalWidth}, clientWidth=${cWidth}`);
            this.reposition(newLeft, null, true);
        }
    }

    raise() {
        this.mainDiv.style.zIndex = String(Navpopup.highest + 1);
        ++Navpopup.highest;
    }

    show() {
        if (this.noshow) {
            return;
        }
        this.reposition();
        this.raise();
        this.unhide();
    }

    showSoonIfStable(time: number) {
        log(`showSoonIfStable, time=${time}`);
        if (this.visible) {
            return;
        }
        this.noshow = false;
        this.stable_x = -1e4;
        this.stable_y = -1e4;
        this.showSoonStableTimer = setInterval(() => {
            log("stableShow called");
            const new_x = Navpopup.tracker.x ?? Number.NaN;
            const new_y = Navpopup.tracker.y ?? Number.NaN;
            const dx = this.stable_x - new_x;
            const dy = this.stable_y - new_y;
            // 上游 fuzz2=0 的写法，等价于 dx、dy 同时恰为 0（完全静止）；
            // tracker 无坐标时为 NaN，永不满足——与 legacy 一致
            if (dx * dx <= 0 && dy * dy <= 0) {
                log("mouse is stable");
                clearInterval(this.showSoonStableTimer);
                this.reposition(new_x + 2, new_y + 2);
                this.show();
                this.limitHorizontalPosition();
                return;
            }
            this.stable_x = new_x;
            this.stable_y = new_y;
        }, time / 2);
    }

    banish() {
        log("banish called");
        this.noshow = true;
        if (this.showSoonStableTimer) {
            log("clearing showSoonStableTimer");
            clearInterval(this.showSoonStableTimer);
        }
        this.hide();
    }

    runHooks(key: string, when?: string) {
        if (!this.hooks[key]) {
            return;
        }
        const keyHooks = this.hooks[key];
        const len = keyHooks.length;
        for (let i = 0; i < len; ++i) {
            const entry = keyHooks[i];
            if (entry && entry.when === when) {
                if (Reflect.apply(entry.hook, this, [])) {
                    if (entry.hookId) {
                        Reflect.deleteProperty(this.hookIds, entry.hookId);
                    }
                    // 槽位置 null 而非删除：保持其余 hook 的下标稳定（上游协议）
                    keyHooks[i] = null;
                }
            }
        }
    }

    addHook(hook: PopupHookFn, key: string, _when?: string, uid?: string) {
        const when = _when ?? "after";
        if (!this.hooks[key]) {
            return;
        }
        let hookId = null;
        if (uid) {
            hookId = [key, when, uid].join("|");
            if (this.hookIds[hookId]) {
                return;
            }
            this.hookIds[hookId] = true;
        }
        this.hooks[key].push({
            hook: hook,
            when: when,
            hookId: hookId,
        });
    }

    createMainDiv() {
        this.runHooks("create", "before");
        const mainDiv = document.createElement("div");
        mainDiv.onclick = () => {
            this.onclickHandler();
        };
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 空串在此取值链里等价于未设置（要回落默认前缀），?? 会改变该语义
        mainDiv.className = this.className ? this.className : "navpopup_maindiv";
        mainDiv.id = `${mainDiv.className}${this.uid}`;
        mainDiv.style.position = "absolute";
        // 350px：上游定死的最小宽度，保证菜单/预览内容不塌缩
        mainDiv.style.minWidth = "350px";
        mainDiv.style.display = "none";
        mainDiv.className = "navpopup";
        (mainDiv as NavpopupDiv).navpopup = this;
        this.mainDiv = mainDiv;
        document.body.appendChild(mainDiv);
        this.runHooks("create", "after");
    }

    onclickHandler() {
        this.raise();
    }

    makeDraggable(handleName?: string | null) {
        const drag = new Drag();
        if (!handleName) {
            // 无把手：仅 Shift 按下时才允许整弹窗拖拽；try/catch 是
            // 上游为读取 shiftKey 可能抛错的老浏览器保留的路径
            drag.startCondition = (e) => {
                try {
                    if (!e.shiftKey) {
                        return false;
                    }
                } catch {
                    return false;
                }
                return true;
            };
        }
        let dragHandle: HTMLElement | null = null;
        if (handleName) {
            dragHandle = document.getElementById(handleName);
        }
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 规则建议的 ??= 是 es2021 语法，产物门禁（acorn es2020）禁用
        if (!dragHandle) {
            dragHandle = this.mainDiv;
        }
        drag.endHook = (x, y) => {
            // 拖拽绕过了 mousemove 语义，置脏让 tracker 下次上报只清脏不跑 hooks
            Navpopup.tracker.dirty = true;
            this.reposition(x, y);
        };
        drag.init(dragHandle, this.mainDiv);
    }

    hide() {
        this.runHooks("hide", "before");
        this.abortDownloads();
        if (this.visible) {
            this.mainDiv.style.display = "none";
            this.visible = false;
        }
        this.runHooks("hide", "after");
    }

    unhide() {
        this.runHooks("unhide", "before");
        if (!this.visible) {
            this.mainDiv.style.display = "inline";
            this.visible = true;
        }
        this.runHooks("unhide", "after");
    }

    setInnerHTML(html: string) {
        this.mainDiv.innerHTML = html;
    }

    updateDimensions() {
        this.width = parseInt(String(this.mainDiv.offsetWidth), 10);
        this.height = parseInt(String(this.mainDiv.offsetHeight), 10);
    }

    isWithin(x?: number, y?: number) {
        if (!this.visible) {
            return false;
        }
        this.updateDimensions();
        const fuzz = this.fuzz || 0;
        const left = this.left ?? Number.NaN;
        const top = this.top ?? Number.NaN;
        // 坐标先求值再比较：末项的 ?? 若留在表达式里，其右支会被
        // 前一项的 NaN 短路永远挡住（y 缺省时第三项必为 false）
        const xx = x ?? Number.NaN;
        const yy = y ?? Number.NaN;
        return xx + fuzz >= left && xx - fuzz <= left + this.width && yy + fuzz >= top && yy - fuzz <= top + this.height;
    }

    abortDownloads() {
        for (const d of this.downloads) {
            d.abort();
        }
        this.downloads.clear();
    }
}
