// Navpopup 弹窗本体：div.navpopup 生命周期（id/类名/样式）、hooks 系统
// （create/unhide/hide × before/after、uid 去重、返回 true 注销）、定位与
// 右溢出收窄（-10000px 测宽、tooWide 一次性豁免）、层级置顶、静止检测
// showSoonIfStable、显示/隐藏/banish、下载中止集合。行为基准 =
// legacy navpopup.ts（commit 02c8dec）。jsdom 不做布局，几何量一律
// Reflect.defineProperty 钉值。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navpopup } from "../../../src/core/popup.ts";
import { Mousetracker } from "../../../src/core/mousetracker.ts";

const stubGeometry = (el: HTMLElement, width: number, height: number): void => {
    Reflect.defineProperty(el, "offsetWidth", { value: width, configurable: true });
    Reflect.defineProperty(el, "offsetHeight", { value: height, configurable: true });
};

const stubClientWidth = (width: number): void => {
    Reflect.defineProperty(document.body, "clientWidth", { value: width, configurable: true });
};

beforeEach(() => {
    vi.useFakeTimers();
    // 静态计数器与 tracker 是模块级状态，逐用例复位保证断言确定性
    Navpopup.uid = 0;
    Navpopup.highest = 1e3;
    Navpopup.tracker = new Mousetracker();
    // jsdom 的 clientWidth 恒 0 会让一切定位都“右溢出”，统一钉成宽视口
    stubClientWidth(1000);
});

afterEach(() => {
    document.body.innerHTML = "";
    Reflect.deleteProperty(document.body, "clientWidth");
    document.onmousemove = null;
    document.onmouseup = null;
    vi.useRealTimers();
});

describe("构造与主 div", () => {
    it("创建 div.navpopup：absolute、minWidth 350px、display none、id 前缀 navpopup_maindiv", () => {
        const navpop = new Navpopup();
        const div = document.body.querySelector<HTMLElement>("div.navpopup");
        expect(div).not.toBeNull();
        expect(div).toBe(navpop.mainDiv);
        expect(div?.id).toBe("navpopup_maindiv0");
        expect(div?.style.position).toBe("absolute");
        expect(div?.style.minWidth).toBe("350px");
        expect(div?.style.display).toBe("none");
        // DOM 侧反查弹窗对象的上游惯例
        expect((div as unknown as { navpopup: Navpopup }).navpopup).toBe(navpop);
        expect(navpop.visible).toBe(false);
        expect(navpop.noshow).toBe(false);
        expect(navpop.uid).toBe(0);
        expect(new Navpopup().uid).toBe(1);
        expect(navpop.fuzz).toBe(5);
        expect(navpop.constrained).toBe(true);
        expect(navpop.downloads).toEqual(new Set());
        expect(Object.keys(navpop.hooks)).toEqual(["create", "unhide", "hide"]);
    });

    it("className 覆盖时 id 用覆盖类名拼 uid（legacy 双 className 赋值语义）", () => {
        const navpop = new Navpopup();
        navpop.className = "customPopup";
        // 重调 createMainDiv：port 无 mainDiv 守卫，会再建一个 div 并改绑 this.mainDiv
        navpop.createMainDiv();
        expect(navpop.mainDiv.id).toBe("customPopup0");
        expect(navpop.mainDiv.className).toBe("navpopup");
        expect(document.body.querySelectorAll(".navpopup")).toHaveLength(2);
    });

    it("create hooks 在 createMainDiv 时以 before/after 顺序执行", () => {
        const navpop = new Navpopup();
        const order: string[] = [];
        navpop.addHook(() => {
            order.push("before");
            return false;
        }, "create", "before");
        navpop.addHook(() => {
            order.push("after");
            return false;
        }, "create", "after");
        navpop.createMainDiv();
        expect(order).toEqual(["before", "after"]);
    });
});

describe("hooks 系统", () => {
    it("addHook 默认 when=after，unhide/hide 按 before → 动作 → after 顺序执行", () => {
        const navpop = new Navpopup();
        let displayAtBefore = "";
        let displayAtAfter = "";
        navpop.addHook(() => {
            displayAtBefore = navpop.mainDiv.style.display;
            return false;
        }, "unhide", "before");
        navpop.addHook(() => {
            displayAtAfter = navpop.mainDiv.style.display;
            return false;
        }, "unhide");
        navpop.unhide();
        expect(displayAtBefore).toBe("none");
        expect(displayAtAfter).toBe("inline");

        let hideBefore = "";
        let hideAfter = "";
        navpop.addHook(() => {
            hideBefore = navpop.mainDiv.style.display;
            return false;
        }, "hide", "before");
        navpop.addHook(() => {
            hideAfter = navpop.mainDiv.style.display;
            return false;
        }, "hide", "after");
        navpop.hide();
        expect(hideBefore).toBe("inline");
        expect(hideAfter).toBe("none");
    });

    it("hook 以弹窗实例为 this 调用", () => {
        const navpop = new Navpopup();
        const seen: unknown[] = [];
        navpop.addHook(function (this: Navpopup) {
            seen.push(this);
            return false;
        }, "unhide", "after");
        navpop.unhide();
        expect(seen[0]).toBe(navpop);
    });

    it("返回 true 的 hook 自动注销（槽位置 null，后续不再执行）", () => {
        const navpop = new Navpopup();
        const once = vi.fn(() => true);
        const keep = vi.fn(() => false);
        navpop.addHook(once, "unhide", "after");
        navpop.addHook(keep, "unhide", "after");
        navpop.unhide();
        expect(once).toHaveBeenCalledTimes(1);
        expect(keep).toHaveBeenCalledTimes(1);
        navpop.unhide();
        expect(once).toHaveBeenCalledTimes(1);
        expect(keep).toHaveBeenCalledTimes(2);
    });

    it("uid 去重：同 (key, when, uid) 只注册一次", () => {
        const navpop = new Navpopup();
        const hook = vi.fn(() => false);
        navpop.addHook(hook, "hide", "after", "uid1");
        navpop.addHook(hook, "hide", "after", "uid1");
        expect(navpop.hookIds).toEqual({ "hide|after|uid1": true });
        navpop.hide();
        expect(hook).toHaveBeenCalledTimes(1);
    });

    it("同 uid 不同 when 视为不同 hook", () => {
        const navpop = new Navpopup();
        const hook = vi.fn(() => false);
        navpop.addHook(hook, "hide", "before", "uid1");
        navpop.addHook(hook, "hide", "after", "uid1");
        navpop.hide();
        expect(hook).toHaveBeenCalledTimes(2);
    });

    it("返回 true 注销后同 uid 可重新注册", () => {
        const navpop = new Navpopup();
        const once = vi.fn(() => true);
        navpop.addHook(once, "hide", "after", "u");
        navpop.hide();
        navpop.addHook(once, "hide", "after", "u");
        navpop.hide();
        expect(once).toHaveBeenCalledTimes(2);
    });

    it("未注册的 hook key 被忽略（addHook 与 runHooks 都不炸）", () => {
        const navpop = new Navpopup();
        const hook = vi.fn(() => true);
        navpop.addHook(hook, "bogus");
        expect(Object.keys(navpop.hooks)).toEqual(["create", "unhide", "hide"]);
        expect(() => {
            navpop.runHooks("bogus", "after");
        }).not.toThrow();
        expect(hook).not.toHaveBeenCalled();
    });

    it("runHooks 只执行匹配 when 的 hook", () => {
        const navpop = new Navpopup();
        const before = vi.fn(() => false);
        const after = vi.fn(() => false);
        navpop.addHook(before, "hide", "before");
        navpop.addHook(after, "hide", "after");
        navpop.runHooks("hide", "before");
        expect(before).toHaveBeenCalledTimes(1);
        expect(after).not.toHaveBeenCalled();
    });
});

describe("reposition 与 limitHorizontalPosition", () => {
    it("reposition(x,y) 写入 left/top 与 style", () => {
        const navpop = new Navpopup();
        navpop.reposition(10, 20);
        expect(navpop.left).toBe(10);
        expect(navpop.top).toBe(20);
        expect(navpop.mainDiv.style.left).toBe("10px");
        expect(navpop.mainDiv.style.top).toBe("20px");
    });

    it("x/y 传 null 表示保留旧值", () => {
        const navpop = new Navpopup();
        navpop.reposition(800, 20);
        navpop.reposition(null, 30);
        expect(navpop.left).toBe(800);
        expect(navpop.top).toBe(30);
        expect(navpop.mainDiv.style.left).toBe("800px");
        expect(navpop.mainDiv.style.top).toBe("30px");
    });

    it("left/top 任一未设置时不写 style，但仍执行水平限制", () => {
        const navpop = new Navpopup();
        navpop.reposition(5, null);
        expect(navpop.left).toBe(5);
        expect(navpop.mainDiv.style.left).toBe("");
        navpop.reposition(null, 7);
        expect(navpop.mainDiv.style.left).toBe("5px");
        expect(navpop.mainDiv.style.top).toBe("7px");
    });

    it("noLimitHor 跳过水平限制（右溢出也不探测）", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        navpop.reposition(800, 20, true);
        expect(navpop.mainDiv.style.left).toBe("800px");
        expect(navpop.mainDiv.style.width).toBe("");
    });

    it("右溢出：先移出屏(-10000px)钉 maxWidth 测自然宽，再贴回右缘", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        navpop.maxWidth = 400;
        navpop.reposition(800, 100);
        expect(navpop.left).toBe(699);
        expect(navpop.mainDiv.style.left).toBe("699px");
        expect(navpop.mainDiv.style.width).toBe("400px");
        expect(navpop.tooWide).toBeUndefined();
    });

    it("高瘦提前收窄：内容未及 maxWidth 但高度大于宽度且已越过收窄线", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 500);
        navpop.maxWidth = 400;
        // 650 + 300 = 950 < 1000（不溢出），但 650 > 1000 - 400 触发第二条件
        navpop.reposition(650, 100);
        expect(navpop.mainDiv.style.left).toBe("699px");
        expect(navpop.mainDiv.style.width).toBe("400px");
    });

    it("视口容不下弹窗：贴 0 且置 tooWide，此后一次性豁免", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        stubClientWidth(200);
        navpop.maxWidth = 400;
        navpop.reposition(150, 100);
        expect(navpop.mainDiv.style.left).toBe("0px");
        expect(navpop.tooWide).toBe(true);
        // 豁免后的 reposition 照常写坐标但不再纠正水平位置（弹窗留在新摆放处）
        navpop.reposition(150, 100);
        expect(navpop.mainDiv.style.left).toBe("150px");
        expect(navpop.mainDiv.style.width).toBe("400px");
    });

    it("constrained=false 时不做水平限制", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        navpop.constrained = false;
        navpop.reposition(800, 20);
        expect(navpop.mainDiv.style.left).toBe("800px");
        expect(navpop.mainDiv.style.width).toBe("");
    });

    it("x=0 不触发高瘦条件", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 500);
        navpop.maxWidth = 400;
        navpop.reposition(0, 100);
        expect(navpop.mainDiv.style.width).toBe("");
    });

    it("宽度已达 maxWidth 不触发高瘦条件", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 500, 700);
        navpop.maxWidth = 400;
        navpop.reposition(100, 100);
        expect(navpop.mainDiv.style.width).toBe("");
    });

    it("高度不超过宽度不触发高瘦条件", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 300);
        navpop.maxWidth = 400;
        navpop.reposition(100, 100);
        expect(navpop.mainDiv.style.width).toBe("");
    });

    it("未越过收窄线（x <= cWidth - maxWidth）不触发", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 500);
        navpop.maxWidth = 400;
        navpop.reposition(550, 100);
        expect(navpop.mainDiv.style.width).toBe("");
    });

    it("maxWidth 未装配时右溢出仍走探测（CSSOM 拒绝 undefinedpx，width 实际不变）", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        navpop.reposition(800, 100);
        expect(navpop.mainDiv.style.left).toBe("699px");
        // legacy 会拼出 "undefinedpx"，浏览器与 jsdom 的 CSSOM 都视其为非法值
        // 而拒绝写入，等效于不动 width
        expect(navpop.mainDiv.style.width).toBe("");
    });
});

describe("层级与点击置顶", () => {
    it("raise 递增静态 highest，从 1000 起", () => {
        const navpop = new Navpopup();
        navpop.raise();
        expect(navpop.mainDiv.style.zIndex).toBe("1001");
        expect(Navpopup.highest).toBe(1001);
        navpop.raise();
        expect(navpop.mainDiv.style.zIndex).toBe("1002");
    });

    it("点击主 div 置顶", () => {
        const navpop = new Navpopup();
        navpop.mainDiv.dispatchEvent(new MouseEvent("click"));
        expect(navpop.mainDiv.style.zIndex).toBe("1001");
    });
});

describe("show / showSoonIfStable / banish", () => {
    it("show：重定位 + 置顶 + 显示", () => {
        const navpop = new Navpopup();
        navpop.show();
        expect(navpop.visible).toBe(true);
        expect(navpop.mainDiv.style.display).toBe("inline");
        expect(navpop.mainDiv.style.zIndex).toBe("1001");
    });

    it("noshow 置位时 show 无效", () => {
        const navpop = new Navpopup();
        navpop.banish();
        navpop.show();
        expect(navpop.visible).toBe(false);
        expect(navpop.mainDiv.style.display).toBe("none");
    });

    it("已可见时 showSoonIfStable 不起定时器", () => {
        const navpop = new Navpopup();
        navpop.show();
        navpop.showSoonIfStable(200);
        expect(navpop.showSoonStableTimer).toBeUndefined();
        expect(vi.getTimerCount()).toBe(0);
    });

    it("鼠标静止后按 delay/2 轮询显示（坐标 +2 偏移）", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        Navpopup.tracker.x = 5;
        Navpopup.tracker.y = 7;
        navpop.showSoonIfStable(200);
        expect(vi.getTimerCount()).toBe(1);
        // 第 1 拍：与引导值 -1e4 不等，仅记录稳定点
        vi.advanceTimersByTime(100);
        expect(navpop.visible).toBe(false);
        // 第 2 拍：完全静止 → 显示并清理定时器
        vi.advanceTimersByTime(100);
        expect(navpop.visible).toBe(true);
        expect(navpop.left).toBe(7);
        expect(navpop.top).toBe(9);
        expect(navpop.mainDiv.style.display).toBe("inline");
        expect(vi.getTimerCount()).toBe(0);
    });

    it("tracker 尚无坐标（NaN 稳定点）时永不显示", () => {
        const navpop = new Navpopup();
        navpop.showSoonIfStable(200);
        vi.advanceTimersByTime(2000);
        expect(navpop.visible).toBe(false);
    });

    it("showSoonIfStable 复位 noshow（banish 后仍可再弹出）", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        navpop.banish();
        Navpopup.tracker.x = 1;
        Navpopup.tracker.y = 1;
        navpop.showSoonIfStable(200);
        vi.advanceTimersByTime(200);
        expect(navpop.visible).toBe(true);
    });

    it("banish：置 noshow、清静止定时器并隐藏", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 300, 100);
        navpop.showSoonIfStable(200);
        navpop.unhide();
        navpop.banish();
        expect(navpop.noshow).toBe(true);
        expect(navpop.visible).toBe(false);
        expect(navpop.mainDiv.style.display).toBe("none");
        expect(vi.getTimerCount()).toBe(0);
    });

    it("banish 在无静止定时器时也可直接调用", () => {
        const navpop = new Navpopup();
        expect(() => {
            navpop.banish();
        }).not.toThrow();
    });
});

describe("hide / unhide / 下载中止集合", () => {
    it("hide：before/after hooks、不可见化；从未显示时 display 不动", () => {
        const navpop = new Navpopup();
        const before = vi.fn(() => false);
        const after = vi.fn(() => false);
        navpop.addHook(before, "hide", "before");
        navpop.addHook(after, "hide", "after");
        navpop.hide();
        expect(before).toHaveBeenCalledTimes(1);
        expect(after).toHaveBeenCalledTimes(1);
        expect(navpop.mainDiv.style.display).toBe("none");
    });

    it("hide 逐个中止在途下载并清空集合，重复 hide 不再中止", () => {
        const navpop = new Navpopup();
        const d1 = { abort: vi.fn() };
        const d2 = { abort: vi.fn() };
        navpop.downloads.add(d1);
        navpop.downloads.add(d2);
        navpop.hide();
        expect(d1.abort).toHaveBeenCalledTimes(1);
        expect(d2.abort).toHaveBeenCalledTimes(1);
        expect(navpop.downloads.size).toBe(0);
        navpop.hide();
        expect(d1.abort).toHaveBeenCalledTimes(1);
    });

    it("banish 经 hide 同样中止在途下载", () => {
        const navpop = new Navpopup();
        const d = { abort: vi.fn() };
        navpop.downloads.add(d);
        navpop.banish();
        expect(d.abort).toHaveBeenCalledTimes(1);
    });

    it("unhide 显示；再次 unhide 不重复改 display 但 hooks 仍执行", () => {
        const navpop = new Navpopup();
        const hook = vi.fn(() => false);
        navpop.addHook(hook, "unhide", "after");
        navpop.unhide();
        navpop.unhide();
        expect(hook).toHaveBeenCalledTimes(2);
        expect(navpop.mainDiv.style.display).toBe("inline");
    });

    it("isVisible 反映可见态", () => {
        const navpop = new Navpopup();
        expect(navpop.isVisible()).toBe(false);
        navpop.unhide();
        expect(navpop.isVisible()).toBe(true);
    });
});

describe("isWithin 与尺寸", () => {
    it("不可见时恒 false", () => {
        const navpop = new Navpopup();
        navpop.left = 100;
        navpop.top = 50;
        expect(navpop.isWithin(105, 55)).toBe(false);
    });

    it("fuzz=5 容差内的命中判定", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.left = 100;
        navpop.top = 50;
        navpop.unhide();
        expect(navpop.isWithin(105, 55)).toBe(true);
        // 距左缘 4px，在 fuzz 容差内
        expect(navpop.isWithin(96, 55)).toBe(true);
        // 超出右缘
        expect(navpop.isWithin(310, 55)).toBe(false);
        // 超出下缘
        expect(navpop.isWithin(105, 160)).toBe(false);
    });

    it("fuzz 覆写为 0 后无容差", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.left = 100;
        navpop.top = 50;
        navpop.fuzz = 0;
        navpop.unhide();
        expect(navpop.isWithin(96, 55)).toBe(false);
    });

    it("无坐标参数且弹窗未定位（left/top 均 NaN）返回 false", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.unhide();
        expect(navpop.isWithin()).toBe(false);
    });

    it("仅 y 缺省（x 轴命中后 y 走 NaN 比较）返回 false", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 200, 100);
        navpop.left = 100;
        navpop.top = 50;
        navpop.unhide();
        expect(navpop.isWithin(105)).toBe(false);
    });

    it("updateDimensions 读 offset 尺寸", () => {
        const navpop = new Navpopup();
        stubGeometry(navpop.mainDiv, 123, 45);
        navpop.updateDimensions();
        expect(navpop.width).toBe(123);
        expect(navpop.height).toBe(45);
    });

    it("setInnerHTML 写主 div", () => {
        const navpop = new Navpopup();
        navpop.setInnerHTML("<b>hi</b>");
        expect(navpop.mainDiv.innerHTML).toBe("<b>hi</b>");
    });
});

describe("makeDraggable", () => {
    it("无 handle：需 Shift 才开始拖，拖完标记 tracker.dirty 并 reposition", () => {
        const navpop = new Navpopup();
        navpop.makeDraggable();
        expect(navpop.mainDiv.onmousedown).toBeTypeOf("function");
        expect(navpop.mainDiv.style.left).toBe("0px");

        // 无 Shift 的 mousedown 不接管
        navpop.mainDiv.dispatchEvent(new MouseEvent("mousedown", { shiftKey: false, clientX: 10, clientY: 10 }));
        expect(document.onmousemove).toBeNull();

        // Shift + mousedown 接管 document 的 DOM0 事件
        navpop.mainDiv.dispatchEvent(new MouseEvent("mousedown", { shiftKey: true, clientX: 100, clientY: 100 }));
        expect(document.onmousemove).toBeTypeOf("function");

        document.dispatchEvent(new MouseEvent("mousemove", { clientX: 130, clientY: 110 }));
        expect(navpop.mainDiv.style.left).toBe("30px");
        expect(navpop.mainDiv.style.top).toBe("10px");

        Navpopup.tracker.dirty = false;
        document.dispatchEvent(new MouseEvent("mouseup"));
        expect(Navpopup.tracker.dirty).toBe(true);
        expect(navpop.left).toBe(30);
        expect(navpop.top).toBe(10);
        expect(document.onmousemove).toBeNull();
    });

    it("无 handle：事件 shiftKey 读取抛错时按不满足条件处理（legacy try/catch）", () => {
        const navpop = new Navpopup();
        navpop.makeDraggable();
        const hostile = {
            clientX: 5,
            clientY: 5,
            get shiftKey(): boolean {
                throw new Error("boom");
            },
        } as unknown as MouseEvent;
        const onmousedown = navpop.mainDiv.onmousedown;
        expect(onmousedown).toBeTypeOf("function");
        expect(() => {
            if (onmousedown) {
                Reflect.apply(onmousedown, navpop.mainDiv, [hostile]);
            }
        }).not.toThrow();
        expect(document.onmousemove).toBeNull();
    });

    it("指定 handle id：把手接管 mousedown，主 div 不接管", () => {
        const navpop = new Navpopup();
        const handle = document.createElement("div");
        handle.id = "myHandle";
        document.body.appendChild(handle);
        navpop.makeDraggable("myHandle");
        expect(handle.onmousedown).toBeTypeOf("function");
        expect(navpop.mainDiv.onmousedown).toBeNull();
    });

    it("handle id 不存在时回落到主 div", () => {
        const navpop = new Navpopup();
        navpop.makeDraggable("noSuchHandle");
        expect(navpop.mainDiv.onmousedown).toBeTypeOf("function");
    });
});

describe("静态装配", () => {
    it("Navpopup.tracker 是共享的 Mousetracker 实例", () => {
        expect(Navpopup.tracker).toBeInstanceOf(Mousetracker);
        const a = new Navpopup();
        const b = new Navpopup();
        expect(a.constructor).toBe(b.constructor);
        // 静态成员经由类访问，两实例共享同一 tracker
        expect(Navpopup.tracker.hooks).toEqual([]);
    });
});
