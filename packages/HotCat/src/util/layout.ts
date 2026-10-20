import { site, state } from "../runtime.ts";

/** 允许按名字读取 clientWidth / scrollLeft 等布局量的视图 */
type MeasuredElement = Record<string, number>;

const readMetric = (element: Element, name: string): number => (element as unknown as MeasuredElement)[name] || 0;

/** 视口尺寸（clientWidth / clientHeight）。 */
const viewport = (what: string): number => {
    const s = `client${what}`;
    return readMetric(document.documentElement, s) || readMetric(document.body, s);
};

/** 滚动偏移（scrollLeft / scrollTop）。 */
const scrollOffset = (what: string): number => {
    const s = `scroll${what}`;
    let result = readMetric(document.documentElement, s) || readMetric(document.body, s);
    if (state.is_rtl && what === "Left") {
        if (result < 0) {
            result = -result;
        }
        if (!site.isWebkit) {
            result = scrollOffset("Width") - viewport("Width") - result;
        }
    }
    return result;
};

/** 元素相对文档的坐标。 */
const position = (node: HTMLElement): { x: number; y: number } => {
    const box = node.getBoundingClientRect();
    return {
        x: Math.round(box.left + scrollOffset("Left")),
        y: Math.round(box.top + scrollOffset("Top")),
    };
};

export { viewport, scrollOffset, position };
