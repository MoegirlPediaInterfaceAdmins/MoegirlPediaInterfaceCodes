// wikitext diff 解析域：行序列的哈希配对（diff）、交叉计数（countCrossings）、
// diff 字符串渲染（diffString）与首尾裁剪（shortenDiffString）。
// 行为基准 = legacy src/modules/diff.ts（commit 02c8dec）逐字照搬，含其怪癖：
// 保留字键的 `<!-- -->` 后缀、diffBugAlert 的静默、短 diff 拼接与长尾段丢弃。
//
// legacy 经 String.prototype.parenSplit / String.prototype.entify 原型扩展做
// 保留捕获组的分割与 HTML 转义；重写版按「顶层零副作用」原则改为 title 域
// parenSplit 与 tools 域 entify 的显式调用，语义等价（现代引擎原生 split
// 保留捕获组，即 legacy isNative=true 分支）。
import { entify } from "../core/tools.ts";
import { parenSplit } from "../title/title.ts";

// diff 单元：字符串 = 未配对；对象 = 带配对行号的（或已配对）单元
export interface DiffEntry {
    text?: string;
    row?: number;
    paired?: boolean;
}
export type DiffCell = string | DiffEntry;

// 单元文本：字符串单元即自身，对象单元取 text（缺失兜空串——legacy 的
// textOf 同名兜底，构造侧恒有 text，仅畸形输入可达）
export const textOf = (x: DiffCell): string => typeof x === "string" ? x : x.text ?? "";

// 单元规整为对象形态（不复制既有对象）
export const entryOf = (x: DiffCell): DiffEntry => typeof x === "string" ? { text: x } : x;

const delFmt = (x: DiffCell[]): string => {
    if (!x.length) {
        return "";
    }
    return `<del class='popupDiff'>${x.map(textOf).join("")}</del>`;
};
const insFmt = (x: DiffCell[]): string => {
    if (!x.length) {
        return "";
    }
    return `<ins class='popupDiff'>${x.map(textOf).join("")}</ins>`;
};

// 在 a、b 两侧按行号算「交叉」数：a[j] 与 b[i] 的行号序关系相反即一次交叉。
// eject 为真时见交叉即返回 true（rmBoringLines 的两两判定用）；b[i] 无行号
// 返回 -1（哨兵，调用方按 falsy 之外的 -1 语义处理——legacy 原样）
export const countCrossings = (a: DiffCell[], b: DiffCell[], i: number, eject?: boolean): number | true => {
    const bEntry = entryOf(b[i]);
    if (!bEntry.row && bEntry.row !== 0) {
        return -1;
    }
    let count = 0;
    for (let j = 0; j < a.length; ++j) {
        const aEntry = entryOf(a[j]);
        if (!aEntry.row && aEntry.row !== 0) {
            continue;
        }
        // istanbul ignore next -- ?? NaN 的兜底侧结构性不可达：上方 !row && row !== 0
        // 守卫已保证两侧 row 均为 number（legacy :32 同款表达式，照搬保留）
        if ((j - (bEntry.row ?? Number.NaN)) * (i - (aEntry.row ?? Number.NaN)) > 0) {
            if (eject) {
                return true;
            }
            count++;
        }
    }
    return count;
};

// 按上下文长度把 diff 串裁剪成若干段：短文本段（< 2*context）与相邻标签合并
// 保留；长文本段只留首尾 context 字符，段间以 <hr /> 相连（由调用方 join）。
// 怪癖照搬勿修：长尾段之后无标签时，else 分支既不保留尾段也不 push（尾段丢
// 弃）；前导空段逐个剔除。
export const shortenDiffString = (str: string, context: number) => {
    const re = /(<del[\s\S]*?<\/del>|<ins[\s\S]*?<\/ins>)/;
    // legacy：str.parenSplit(re)——保留捕获组切分（分隔符本身进产物）
    const splitted = parenSplit(str, re);
    let ret: string[] = [""];
    for (let i = 0; i < splitted.length; i += 2) {
        if (splitted[i].length < 2 * context) {
            ret[ret.length - 1] += splitted[i];
            if (i + 1 < splitted.length) {
                ret[ret.length - 1] += splitted[i + 1];
            }
            continue;
        } else {
            if (i > 0) {
                ret[ret.length - 1] += splitted[i].substring(0, context);
            }
            if (i + 1 < splitted.length) {
                ret.push(splitted[i].substring(splitted[i].length - context) + splitted[i + 1]);
            }
        }
    }
    while (ret.length > 0 && !ret[0]) {
        ret = ret.slice(1);
    }
    return ret;
};

// 对旧的 o 与新的 n 逐单元比对，产出带 <del>/<ins> 标记的 HTML 串。
// simpleSplit：legacy 依 String.prototype.parenSplit.isNative 判定——原生
// split 保留捕获组的现代引擎下恒走 false（parenSplit 分支）；true（\b 分割，
// 不保留分隔符）仅为古引擎补丁路径，重写版无补丁，分支本体由单测直调覆盖。
export const diffString = (o: string, n: string, simpleSplit?: boolean) => {
    const splitRe = /([[]{2}|[\]]{2}|[{]{2,3}|[}]{2,3}|[|]|=|<|>|[*:]+|\s|\b)/;
    let i: number, oSplitted: string[], nSplitted: string[];
    if (simpleSplit) {
        oSplitted = o.split(/\b/);
        nSplitted = n.split(/\b/);
    } else {
        oSplitted = parenSplit(o, splitRe);
        nSplitted = parenSplit(n, splitRe);
    }
    for (i = 0; i < oSplitted.length; ++i) {
        oSplitted[i] = entify(oSplitted[i]);
    }
    for (i = 0; i < nSplitted.length; ++i) {
        nSplitted[i] = entify(nSplitted[i]);
    }
    const out = diff(oSplitted, nSplitted);
    let str = "";
    let acc: DiffCell[] = [];
    let maxOutputPair = 0;
    for (i = 0; i < out.n.length; ++i) {
        const nEntry = entryOf(out.n[i]);
        if (nEntry.paired && typeof nEntry.row === "number") {
            if (maxOutputPair > nEntry.row) {
                out.o[nEntry.row] = textOf(out.o[nEntry.row]);
                out.n[i] = textOf(out.n[i]);
            }
            if (maxOutputPair < nEntry.row) {
                maxOutputPair = nEntry.row;
            }
        }
    }
    for (i = 0; i < out.o.length && !entryOf(out.o[i]).paired; ++i) {
        acc.push(out.o[i]);
    }
    str += delFmt(acc);
    acc = [];
    for (i = 0; i < out.n.length; ++i) {
        while (i < out.n.length && !entryOf(out.n[i]).paired) {
            acc.push(out.n[i++]);
        }
        str += insFmt(acc);
        acc = [];
        if (i < out.n.length) {
            str += textOf(out.n[i]);
            // istanbul ignore next -- ?? -1 的兜底侧结构性不可达：能走到此处的
            // 单元必为 diff() 产出/校验过的 paired 单元，row 恒为 number
            // （legacy :111 同款表达式，照搬保留）
            let m = (entryOf(out.n[i]).row ?? -1) + 1;
            while (m < out.o.length && !entryOf(out.o[m]).paired) {
                acc.push(out.o[m++]);
            }
            str += delFmt(acc);
            acc = [];
        }
    }
    return str;
};

// 对象原型链上的保留属性名：这些词进 diff 哈希表时命中继承属性（truthy 但
// 非数组），legacy 以加 `<!-- -->` 后缀的文本规避（运行时行为：配对键为加
// 后缀后的文本，见用例）
const jsReservedProperties = RegExp("^(constructor|prototype|__((define|lookup)[GS]etter)__|eval|hasOwnProperty|propertyIsEnumerable|to(Source|String|LocaleString)|(un)?watch|valueOf)$");
// 保留字触发的历史告警：同一词只提示一次（列表挂在函数对象上，legacy 同款）
const diffBugAlert = (word: string) => {
    // istanbul ignore if -- 结构性不可达：能走到 push 抛错的词必是
    // Object.prototype 上的既有成员（继承的 truthy 值让 ret[key] 看似已初始化，
    // 却无 push），而同一 word 在本表（普通对象字面量、与 {}.方法 同源原型链）
    // 上同样命中继承的 truthy 成员，!diffBugAlert.list[word] 恒假；legacy
    // :122-127 的告警分支同款照搬
    if (!diffBugAlert.list[word]) {
        diffBugAlert.list[word] = 1;
        alert(`Bad word: ${word}\n\nPlease report this bug.`);
    }
};
diffBugAlert.list = {} as Record<string, number>;

// 单元数组 → 文本 → 出现下标列表的哈希表；保留字单元的文本加 `<!-- -->` 后缀
// （legacy 规避原型链属性名的历史写法；键仍取加后缀前的文本，故 reserve 词
// 走 push 抛错分支）
const makeDiffHashtable = (src: DiffCell[]) => {
    const ret: Record<string, number[]> = {};
    for (let i = 0; i < src.length; i++) {
        const key = textOf(src[i]);
        if (jsReservedProperties.test(key)) {
            src[i] = `${key}<!-- -->`;
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- sparse record: keys appear dynamically at runtime
        if (!ret[key]) {
            ret[key] = [];
        }
        try {
            ret[key].push(i);
        } catch {
            diffBugAlert(key);
        }
    }
    return ret;
};

// 把 o、n 两侧「唯一且文本相同」的单元两两配对（行号互指），再做两次相邻
// 单元的补齐配对（先向后、再向前），就地修改并返回同一对数组
export const diff = (o: DiffCell[], n: DiffCell[]): { o: DiffCell[]; n: DiffCell[] } => {
    const ns = makeDiffHashtable(n);
    const os = makeDiffHashtable(o);
    let i: string | number;
    for (i in ns) {
        const osi = os[i] as number[] | undefined;
        if (ns[i].length === 1 && osi?.length === 1) {
            n[ns[i][0]] = {
                text: textOf(n[ns[i][0]]),
                row: os[i][0],
                paired: true,
            };
            o[os[i][0]] = {
                text: textOf(o[os[i][0]]),
                row: ns[i][0],
                paired: true,
            };
        }
    }
    for (i = 0; i < n.length - 1; i++) {
        const entry = entryOf(n[i]);
        const row = entry.row ?? -1;
        if (entry.paired && !entryOf(n[i + 1]).paired && row + 1 < o.length && !entryOf(o[row + 1]).paired && textOf(n[i + 1]) === textOf(o[row + 1])) {
            n[i + 1] = {
                text: textOf(n[i + 1]),
                row: row + 1,
                paired: true,
            };
            o[row + 1] = {
                text: textOf(o[row + 1]),
                row: i + 1,
                paired: true,
            };
        }
    }
    for (i = n.length - 1; i > 0; i--) {
        const entry = entryOf(n[i]);
        const row = entry.row ?? -1;
        if (entry.paired && !entryOf(n[i - 1]).paired && row > 0 && !entryOf(o[row - 1]).paired && textOf(n[i - 1]) === textOf(o[row - 1])) {
            n[i - 1] = {
                text: textOf(n[i - 1]),
                row: row - 1,
                paired: true,
            };
            o[row - 1] = {
                text: textOf(o[row - 1]),
                row: i - 1,
                paired: true,
            };
        }
    }
    return {
        o: o,
        n: n,
    };
};
