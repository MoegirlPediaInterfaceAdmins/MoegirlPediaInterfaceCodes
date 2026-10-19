/** 创建元素或文本节点。 */
function make<K extends keyof HTMLElementTagNameMap>(tag: K, literal?: false): HTMLElementTagNameMap[K];
function make(text: string, literal: true): Text;
function make(arg: string, literal?: boolean): Node | null;
function make(arg: string, literal = false): Node | null {
    if (!arg) {
        return null;
    }
    return literal ? document.createTextNode(arg) : document.createElement(arg);
}

/** 判断 class。 */
const hasClass = (elem: Element, name: string): boolean => ` ${elem.className} `.includes(` ${name} `);

/** 查找 `tag.className`。 */
const findByClass = (scope: Document | Element, tag: string, className: string): Element | null => {
    const result = $(scope).find(`${tag}.${className}`);
    return result.length ? result[0] : null;
};

/** 触发重绘。 */
let dummyElement: Text | null = null;
const forceRedraw = (): void => {
    dummyElement ??= document.createTextNode("\u00A0");
    if (dummyElement.parentNode) {
        document.body.removeChild(dummyElement);
    } else {
        document.body.appendChild(dummyElement);
    }
};

export { make, hasClass, findByClass, forceRedraw };
