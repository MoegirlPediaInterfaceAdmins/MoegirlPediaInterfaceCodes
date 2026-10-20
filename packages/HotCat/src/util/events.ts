/** 修饰键 */
interface ModifierKeys {
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
}

/** 修饰键位：Ctrl/Cmd 为 1，Shift 为 2。 */
const evtKeys = (e: ModifierKeys): number => {
    let code = 0;
    if (e.ctrlKey) {
        code |= 1;
        if (e.shiftKey) {
            code |= 2;
        }
    }
    return code;
};

/** 阻止默认行为与冒泡，并返回 false 供 DOM0 处理器直接 return */
const evtKill = (e: Event): boolean => {
    e.preventDefault();
    e.stopPropagation();
    return false;
};

const BS = 8;
const TAB = 9;
const RET = 13;
const ESC = 27;
const SPACE = 32;
const PGUP = 33;
const PGDOWN = 34;
const UP = 38;
const DOWN = 40;
const DEL = 46;
/** IME 组合输入期间 keydown 的 keyCode */
const IME = 229;

export { evtKeys, evtKill, BS, TAB, RET, ESC, SPACE, PGUP, PGDOWN, UP, DOWN, DEL, IME };
export type { ModifierKeys };
