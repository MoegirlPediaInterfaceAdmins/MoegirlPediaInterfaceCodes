// Drag：DOM0 接管 document.onmousemove/onmouseup 的拖拽、startCondition
// 门控（hmode/vmode 轴开关）、endHook 回调；setupDraggable 装配
// popupDraggable/popupDragHandle 选项与 150ms 延迟绑定。行为基准 =
// legacy domdrag.ts 的 Drag 类 + actions.ts simplePopupContent 的内联装配。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drag, setupDraggable } from "../../../src/core/drag.ts";
import type { DragHandle } from "../../../src/core/drag.ts";
import { optionStore } from "../../../src/core/options.ts";

// init() 把拖拽状态装饰到元素上（上游惯例的 ad-hoc 属性面），测试侧经此取回
const handleOf = (el: HTMLElement): DragHandle => el as DragHandle;

const makeDrag = (): { drag: Drag; obj: DragHandle; root: DragHandle } => {
    const drag = new Drag();
    const root = document.createElement("div");
    const obj = document.createElement("div");
    document.body.append(obj, root);
    drag.init(obj, root);
    return { drag, obj: handleOf(obj), root: handleOf(root) };
};

// DOM0 handler 的 this 参数在 lib.dom 里钉成 GlobalEventHandlers，统一 .call 派发
const mouse = (type: string, x: number, y: number, shiftKey = false): MouseEvent =>
    new MouseEvent(type, { clientX: x, clientY: y, shiftKey });

beforeEach(() => {
    vi.useFakeTimers();
    // setupDraggable 读取的两个选项用例间复位，避免粘性缓存串扰
    Reflect.deleteProperty(optionStore, "popupDraggable");
    Reflect.deleteProperty(optionStore, "popupDragHandle");
});

afterEach(() => {
    document.body.innerHTML = "";
    document.onmousemove = null;
    document.onmouseup = null;
    vi.useRealTimers();
});

describe("fixE", () => {
    it("无事件且 window.event 未定义时返回 undefined", () => {
        const drag = new Drag();
        expect(drag.fixE()).toBeUndefined();
    });

    it("layerX/layerY 缺失时用 offsetX/offsetY 补齐（lib.dom 只读属性的可写视图补丁）", () => {
        const drag = new Drag();
        const e = { offsetX: 3, offsetY: 4 } as unknown as MouseEvent;
        const fixed = drag.fixE(e) as unknown as { layerX: number; layerY: number };
        expect(fixed.layerX).toBe(3);
        expect(fixed.layerY).toBe(4);
    });

    it("layerX/layerY 已有值时不覆盖", () => {
        const drag = new Drag();
        const e = { layerX: 9, layerY: 8, offsetX: 1, offsetY: 2 } as unknown as MouseEvent;
        const fixed = drag.fixE(e) as unknown as { layerX: number; layerY: number };
        expect(fixed.layerX).toBe(9);
        expect(fixed.layerY).toBe(8);
    });
});

describe("init", () => {
    it("挂 mousedown、置拖拽状态默认值、规范 root 初始坐标", () => {
        const { obj, root } = makeDrag();
        expect(obj.onmousedown).toBeTypeOf("function");
        expect(obj.dragging).toBe(false);
        expect(obj.popups_draggable).toBe(true);
        expect(obj.hmode).toBe(true);
        expect(obj.vmode).toBe(true);
        expect(obj.root).toBe(root);
        expect(root.style.left).toBe("0px");
        expect(root.style.top).toBe("0px");
        expect(root.onthisStart).toBeTypeOf("function");
        expect(root.onthisEnd).toBeTypeOf("function");
        expect(root.onthis).toBeTypeOf("function");
        // 三个 onthis* 是装配方可覆写的扩展点，Drag 自身不调用；
        // init 预置的默认实现为无操作
        expect(() => {
            root.onthisStart();
            root.onthisEnd();
            root.onthis();
        }).not.toThrow();
    });

    it("root 已有可解析坐标时保留", () => {
        const drag = new Drag();
        const root = document.createElement("div");
        root.style.left = "5px";
        root.style.top = "-7px";
        const obj = document.createElement("div");
        document.body.append(obj, root);
        drag.init(obj, root);
        expect(root.style.left).toBe("5px");
        expect(root.style.top).toBe("-7px");
    });
});

describe("start / drag / end", () => {
    it("start 无事件时直接返回，不接管", () => {
        const { drag } = makeDrag();
        expect(drag.start()).toBeUndefined();
        expect(document.onmousemove).toBeNull();
    });

    it("startCondition 为 null 时不设门控，mousedown 直接接管", () => {
        const { drag, obj } = makeDrag();
        expect(drag.startCondition).toBeNull();
        obj.dispatchEvent(mouse("mousedown", 1, 1));
        expect(document.onmousemove).toBeTypeOf("function");
        document.dispatchEvent(mouse("mouseup", 1, 1));
    });

    it("startCondition 拒绝时不接管", () => {
        const { drag, obj } = makeDrag();
        drag.startCondition = () => false;
        obj.dispatchEvent(mouse("mousedown", 1, 1));
        expect(document.onmousemove).toBeNull();
    });

    it("start：记录起点、通知 onthisStart、接管 document DOM0 事件", () => {
        const { drag, obj, root } = makeDrag();
        root.style.left = "5px";
        root.style.top = "10px";
        const started: unknown[] = [];
        root.onthisStart = (x, y) => {
            started.push(x, y);
        };
        const prior = () => "prior";
        document.onmousemove = prior;
        drag.startCondition = () => true;
        obj.dispatchEvent(mouse("mousedown", 100, 100));
        expect(started).toEqual([5, 10]);
        expect(obj.dragging).toBe(true);
        expect(document.onmousemove).not.toBe(prior);
        expect(document.onmouseup).toBeTypeOf("function");
        document.dispatchEvent(mouse("mouseup", 100, 100));
    });

    it("hmode/vmode 关闭时 start 改读 right/bottom 坐标", () => {
        const { drag, obj, root } = makeDrag();
        root.style.right = "8px";
        root.style.bottom = "7px";
        obj.hmode = false;
        obj.vmode = false;
        const started: unknown[] = [];
        root.onthisStart = (x, y) => {
            started.push(x, y);
        };
        drag.startCondition = () => true;
        obj.dispatchEvent(mouse("mousedown", 0, 0));
        expect(started).toEqual([8, 7]);
        document.dispatchEvent(mouse("mouseup", 0, 0));
    });

    it("drag 无事件时无操作", () => {
        const { drag } = makeDrag();
        expect(drag.drag()).toBeUndefined();
    });

    it("drag：按位移差移动 root 并通知 onthis", () => {
        const { obj, root } = makeDrag();
        obj.dispatchEvent(mouse("mousedown", 100, 100));
        const moved: unknown[] = [];
        root.onthis = (x, y) => {
            moved.push(x, y);
        };
        document.dispatchEvent(mouse("mousemove", 130, 110));
        expect(root.style.left).toBe("30px");
        expect(root.style.top).toBe("10px");
        expect(moved).toEqual([30, 10]);
        // 反向位移同样按差值累加
        document.dispatchEvent(mouse("mousemove", 90, 95));
        expect(root.style.left).toBe("-10px");
        expect(root.style.top).toBe("-5px");
        document.dispatchEvent(mouse("mouseup", 90, 95));
    });

    it("hmode/vmode 关闭时 drag 写 right/bottom 且方向反转", () => {
        const { drag, obj, root } = makeDrag();
        const ended = vi.fn();
        drag.endHook = ended;
        root.style.right = "0px";
        root.style.bottom = "0px";
        obj.hmode = false;
        obj.vmode = false;
        obj.dispatchEvent(mouse("mousedown", 100, 100));
        document.dispatchEvent(mouse("mousemove", 130, 90));
        // (130-100)*-1 = -30 → right: -30px；(90-100)*-1 = 10 → bottom: 10px
        expect(root.style.right).toBe("-30px");
        expect(root.style.bottom).toBe("10px");
        // left/top 是 init() 规范出的 "0px"，hmode/vmode 关闭后不再被改写
        expect(root.style.left).toBe("0px");
        document.dispatchEvent(mouse("mouseup", 130, 90));
        // end 也按 h/v 关闭读 right/bottom 回调 endHook
        expect(ended).toHaveBeenCalledWith(-30, 10);
    });

    it("end：恢复旧 handler、清空 onmouseup、结束拖拽态", () => {
        const { obj } = makeDrag();
        const prior = () => "prior";
        document.onmousemove = prior;
        obj.dispatchEvent(mouse("mousedown", 100, 100));
        document.dispatchEvent(mouse("mousemove", 130, 110));
        document.dispatchEvent(mouse("mouseup", 130, 110));
        expect(document.onmousemove).toBe(prior);
        expect(document.onmouseup).toBeNull();
        expect(obj.dragging).toBe(false);
    });

    it("end 回调 endHook 并传入解析后的最终坐标；无 endHook 时安全", () => {
        const { obj } = makeDrag();
        obj.dispatchEvent(mouse("mousedown", 100, 100));
        document.dispatchEvent(mouse("mousemove", 130, 110));
        // 未注入 endHook 的裸 end 不抛错
        expect(() => {
            document.dispatchEvent(mouse("mouseup", 130, 110));
        }).not.toThrow();

        const withHook = makeDrag();
        const hook = vi.fn();
        withHook.drag.endHook = hook;
        withHook.obj.dispatchEvent(mouse("mousedown", 100, 100));
        document.dispatchEvent(mouse("mousemove", 130, 110));
        document.dispatchEvent(mouse("mouseup", 130, 110));
        expect(hook).toHaveBeenCalledWith(30, 10);
    });
});

describe("setupDraggable 装配", () => {
    it("popupDraggable 关闭时不绑定", () => {
        optionStore.popupDraggable = false;
        const navpop = { idNumber: 7, makeDraggable: vi.fn() };
        setupDraggable(navpop);
        vi.advanceTimersByTime(1000);
        expect(navpop.makeDraggable).not.toHaveBeenCalled();
    });

    it("handle 名按弹窗编号拼后缀，150ms 后绑定", () => {
        optionStore.popupDraggable = true;
        optionStore.popupDragHandle = "popupTopLinks";
        const navpop = { idNumber: 7, makeDraggable: vi.fn() };
        setupDraggable(navpop);
        vi.advanceTimersByTime(149);
        expect(navpop.makeDraggable).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(navpop.makeDraggable).toHaveBeenCalledWith("popupTopLinks7");
    });

    it("popupDragHandle 为 all 时不加编号后缀", () => {
        optionStore.popupDraggable = true;
        optionStore.popupDragHandle = "all";
        const navpop = { idNumber: 7, makeDraggable: vi.fn() };
        setupDraggable(navpop);
        vi.advanceTimersByTime(150);
        expect(navpop.makeDraggable).toHaveBeenCalledWith("all");
    });

    it("popupDragHandle 未设置（undefined）时按 null 透传", () => {
        optionStore.popupDraggable = true;
        const navpop = { idNumber: 7, makeDraggable: vi.fn() };
        setupDraggable(navpop);
        vi.advanceTimersByTime(150);
        expect(navpop.makeDraggable).toHaveBeenCalledWith(null);
    });

    it("popupDragHandle 为 false（默认值）时原样透传，makeDraggable 走 Shift 拖拽", () => {
        optionStore.popupDraggable = true;
        optionStore.popupDragHandle = false;
        const navpop = { idNumber: 7, makeDraggable: vi.fn() };
        setupDraggable(navpop);
        vi.advanceTimersByTime(150);
        expect(navpop.makeDraggable).toHaveBeenCalledWith(false);
    });
});
