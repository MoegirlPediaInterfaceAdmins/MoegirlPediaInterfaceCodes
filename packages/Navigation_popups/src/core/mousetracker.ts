// 鼠标追踪域：DOM0 接管 document.onmousemove、坐标记录、400ms 兜底轮询、
// 移动阈值过滤与 dirty 污染传播。行为基准 = legacy selpop.ts 的
// Mousetracker（commit 02c8dec；上游 navpopup.js，类随 legacy 拆分留在 selpop）。
// 本类只做被动记录与轮询，不感知弹窗；Navpopup.tracker 静态装配见 popup.ts。

// hook 返回 true 表示请求注销自身（runHooks 的移除协议，mouseout 域的
// posCheckerHook 靠它退出）；x/y 为 undefined 时表示尚无任何鼠标记录。
export type MousetrackFn = (x?: number, y?: number) => boolean | undefined;

export class Mousetracker {
    x?: number;
    y?: number;
    // 400ms：上游定值——鼠标静止（无 mousemove 事件）时也要周期性跑 hooks，
    // 否则 posCheckerHook 的隐藏倒计时在鼠标停下后就再无机会推进
    loopDelay = 400;
    // ReturnType 形式兼容 DOM（number）与 Node（Timeout）两套定时器类型环境
    timer: ReturnType<typeof setInterval> | null = null;
    active = false;
    // 拖拽等绕过 mousemove 的操作结束后置脏：下一次坐标上报先清脏、
    // 不跑 hooks（拖完瞬间不该触发“鼠标移到弹窗外就藏”之类判定）
    dirty = true;
    hooks: MousetrackFn[] = [];
    lastHook_x?: number;
    lastHook_y?: number;
    savedHandler?: GlobalEventHandlers["onmousemove"];

    addHook(f: MousetrackFn) {
        this.hooks.push(f);
    }

    runHooks() {
        if (!this.hooks.length) {
            return;
        }
        let remove = false;
        const removeObj: Record<number, boolean> = {};
        const x = this.x, y = this.y, len = this.hooks.length;
        for (let i = 0; i < len; ++i) {
            if (this.hooks[i](x, y) === true) {
                remove = true;
                removeObj[i] = true;
            }
        }
        if (remove) {
            this.removeHooks(removeObj);
        }
    }

    removeHooks(removeObj: Record<number, boolean>) {
        const newHooks: MousetrackFn[] = [];
        const len = this.hooks.length;
        for (let i = 0; i < len; ++i) {
            if (!removeObj[i]) {
                newHooks.push(this.hooks[i]);
            }
        }
        this.hooks = newHooks;
    }

    track(_e?: MouseEvent) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy window.event 回退是上游行为
        const e = _e ?? (window.event as MouseEvent | undefined);
        let x: number, y: number;
        if (e) {
            if (e.pageX) {
                x = e.pageX;
                y = e.pageY;
            } else if (typeof e.clientX !== "undefined") {
                const docElt = document.documentElement;
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 偏移要落到下一级取值，|| 链是故意的上游行为
                const left = docElt.scrollLeft || document.body.scrollLeft || document.scrollLeft || 0;
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 偏移要落到下一级取值，|| 链是故意的上游行为
                const top = docElt.scrollTop || document.body.scrollTop || document.scrollTop || 0;
                x = e.clientX + left;
                y = e.clientY + top;
            } else {
                return;
            }
            this.setPosition(x, y);
        }
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
        if (this.dirty || this.hooks.length === 0) {
            this.dirty = false;
            return;
        }
        if (typeof this.lastHook_x !== "number" || typeof this.lastHook_y !== "number") {
            // -100：上游引导值——与真实坐标的乘积必然远超阈值，保证首次
            // 有效移动立即跑一次 hooks
            this.lastHook_x = -100;
            this.lastHook_y = -100;
        }
        // 两轴位移的乘积作移动量代理（阈值 1）：单轴微动乘积为 0 不触发
        let diff = (this.lastHook_x - x) * (this.lastHook_y - y);
        diff = diff >= 0 ? diff : -diff;
        if (diff > 1) {
            this.lastHook_x = x;
            this.lastHook_y = y;
            this.runHooks();
        }
    }

    enable() {
        if (this.active) {
            return;
        }
        this.active = true;
        // DOM0 属性接管（而非 addEventListener）是上游刻意为之：独占
        // onmousemove，disable 时把此处保存的旧 handler 原样放回
        this.savedHandler = document.onmousemove;
        document.onmousemove = (e) => {
            this.track(e);
        };
        if (this.loopDelay) {
            this.timer = setInterval(() => {
                this.runHooks();
            }, this.loopDelay);
        }
    }

    disable() {
        if (!this.active) {
            return;
        }
        if (typeof this.savedHandler === "function") {
            document.onmousemove = this.savedHandler;
        } else {
            // 现代浏览器（及 jsdom）的 on* 访问器存活于原型，delete 移不掉
            // 已设置的 handler——上游“半心半意”的保存/恢复即指此；照搬
            Reflect.deleteProperty(document, "onmousemove");
        }
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.active = false;
    }
}
