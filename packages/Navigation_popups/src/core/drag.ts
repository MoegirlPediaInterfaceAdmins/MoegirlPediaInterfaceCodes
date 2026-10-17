// 拖拽域：Drag 类（DOM0 接管 document.onmousemove/onmouseup 的位移拖拽）
// 与 setupDraggable 装配（popupDraggable/popupDragHandle 选项 + 150ms 延迟
// 绑定）。行为基准 = legacy domdrag.ts 的 Drag 类（commit 02c8dec）+
// legacy actions.ts simplePopupContent 内联的选项装配段（重写版收拢到
// 拖拽域导出，供 events 域装配弹窗内容时调用）。
import { getValueOf } from "./options.ts";

// init() 装饰到元素上的拖拽状态（上游 ad-hoc 属性面）：只有经过 init()
// 的元素才有这些属性，且 init() 会一次性赋全。
export type DragHandle = HTMLElement & {
    dragging: boolean;
    popups_draggable: boolean;
    hmode: boolean;
    vmode: boolean;
    root: DragHandle;
    lastMouseX: number;
    lastMouseY: number;
    onmousemoveDefault: GlobalEventHandlers["onmousemove"];
    onthisStart: (x?: number, y?: number) => void;
    onthisEnd: () => void;
    onthis: (x?: number, y?: number) => void;
};

export class Drag {
    obj!: DragHandle;
    startCondition: ((e: MouseEvent) => boolean) | null = null;
    endHook: ((x: number | undefined, y: number | undefined) => void) | null = null;
    fixE = (_e?: MouseEvent) => {
        let e = _e;
        if (typeof e === "undefined") {
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy window.event 回退是上游行为
            e = window.event as MouseEvent | undefined;
        }
        if (!e) {
            return e;
        }
        // lib.dom 把 layerX/layerY 声明为恒存在且只读；上游会为老浏览器
        // 补丁这两个属性，因此经同一对象的可变视图写入
        const legacy = e as unknown as { layerX?: number; layerY?: number; offsetX: number; offsetY: number };
        if (typeof legacy.layerX === "undefined") {
            legacy.layerX = legacy.offsetX;
        }
        if (typeof legacy.layerY === "undefined") {
            legacy.layerY = legacy.offsetY;
        }
        return e;
    };
    init(o: HTMLElement, oRoot: HTMLElement) {
        const obj = o as DragHandle;
        this.obj = obj;
        obj.onmousedown = (e) => {
            this.start(e);
        };
        obj.dragging = false;
        obj.popups_draggable = true;
        obj.hmode = true;
        obj.vmode = true;
        obj.root = oRoot as DragHandle;
        if (isNaN(parseInt(obj.root.style.left, 10))) {
            obj.root.style.left = "0px";
        }
        if (isNaN(parseInt(obj.root.style.top, 10))) {
            obj.root.style.top = "0px";
        }
        obj.root.onthisStart = () => { /* no-op by design */ };
        obj.root.onthisEnd = () => { /* no-op by design */ };
        obj.root.onthis = () => { /* no-op by design */ };
    }
    start(_e?: MouseEvent) {
        let e = _e;
        const o = this.obj;
        e = this.fixE(e);
        if (!e) {
            return;
        }
        if (this.startCondition && !this.startCondition(e)) {
            return;
        }
        const y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
        const x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
        o.root.onthisStart(x, y);
        o.lastMouseX = e.clientX;
        o.lastMouseY = e.clientY;
        // DOM0 属性接管（而非 addEventListener）：拖拽期间独占 document 的
        // mousemove/mouseup，结束时把旧 handler 原样放回
        o.onmousemoveDefault = document.onmousemove;
        o.dragging = true;
        document.onmousemove = (e) => {
            this.drag(e);
        };
        document.onmouseup = () => {
            this.end();
        };
        return false;
    }
    drag(_e?: MouseEvent) {
        let e = _e;
        e = this.fixE(e);
        if (!e) {
            return;
        }
        const o = this.obj;
        const ey = e.clientY;
        const ex = e.clientX;
        const y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
        const x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
        const nx = x + (ex - o.lastMouseX) * (o.hmode ? 1 : -1);
        const ny = y + (ey - o.lastMouseY) * (o.vmode ? 1 : -1);
        this.obj.root.style[o.hmode ? "left" : "right"] = `${nx}px`;
        this.obj.root.style[o.vmode ? "top" : "bottom"] = `${ny}px`;
        this.obj.lastMouseX = ex;
        this.obj.lastMouseY = ey;
        this.obj.root.onthis(nx, ny);
        return false;
    }
    end() {
        document.onmousemove = this.obj.onmousemoveDefault;
        document.onmouseup = null;
        this.obj.dragging = false;
        if (this.endHook) {
            this.endHook(parseInt(this.obj.root.style[this.obj.hmode ? "left" : "right"], 10), parseInt(this.obj.root.style[this.obj.vmode ? "top" : "bottom"], 10));
        }
    }
}

// setupDraggable 的最小装配面：Navpopup 满足该结构（makeDraggable +
// idNumber），以结构类型解耦，避免 drag ↔ popup 运行时循环依赖
export interface DraggablePopup {
    idNumber?: number;
    makeDraggable(handleName?: string | null): void;
}

export const setupDraggable = (navpop: DraggablePopup): void => {
    if (!getValueOf("popupDraggable")) {
        return;
    }
    let dragHandle = (getValueOf("popupDragHandle") as string | null) ?? null;
    // all 表示全部弹窗共用同一把手 id，不按弹窗编号拼后缀
    if (dragHandle && dragHandle !== "all") {
        dragHandle += String(navpop.idNumber);
    }
    // 150ms：等弹窗内容（含把手元素）先渲染完成再绑定，legacy 定值
    setTimeout(() => {
        navpop.makeDraggable(dragHandle);
    }, 150);
};
