// 通用工具函数域：行为规格 = legacy src/modules/tools.ts（commit 02c8dec）。
// 重写版映射：String.prototype.entify 原型扩展与 pg.escapeQuotesHTML /
// pg.unescapeQuotesHTML 挂载均按「顶层零副作用」原则函数化为导出函数；
// upcaseFirst/simplePrintf/parenSplit 分别归属 title/strings 域，不在此重复。
import { errlog, log } from "./log.ts";

// 剥离 g 标志的正则副本。legacy 从 toString() 末尾倒序收集标志：起点
// s.length 越界处 charAt 返回空串（同样被无谓地 append 进 flags，无副作用），
// 该倒序收集与 RegExp 构造器的标志集合语义等价——照搬勿修。
export const nonGlobalRegex = (re: RegExp): RegExp => {
    const s = re.toString();
    let flags = "";
    let j = s.length;
    for (; s.charAt(j) !== "/"; --j) {
        if (s.charAt(j) !== "g") {
            flags += s.charAt(j);
        }
    }
    const t = s.substring(1, j);
    return RegExp(t, flags);
};

// JSON 解析 + MediaWiki API 的 warnings/error 诊断透传（legacy 调试噪声照搬）；
// 解析失败返回哨兵值 1，调用方以 truthy/falsy 区分（legacy 原样）
export const getJsObj = (json: string): object | 1 => {
    try {
        const json_ret = JSON.parse(json) as { warnings?: { "*": string; warnings: string }[]; error?: { code: string; info: string } } & object;
        if (json_ret.warnings) {
            for (const warning of json_ret.warnings) {
                if (warning["*"]) {
                    log(warning["*"]);
                } else {
                    log(warning.warnings);
                }
            }
        } else if (json_ret.error) {
            errlog(`${json_ret.error.code}: ${json_ret.error.info}`);
        }
        return json_ret;
    } catch {
        errlog(`Something went wrong with getJsObj, json=${json}`);
        return 1;
    }
};

// 取对象首个自有键的值（for-in 语义：数值型字符串键按数值升序，其余按
// 插入序）；MediaWiki API 的 query.pages 以页 id 为键，任取一页即「该条目」
export const anyChild = <T>(obj: Record<string, T>): T | null => {
    for (const p in obj) {
        return obj[p];
    }
    return null;
};

// 正则元字符字面量化：mw.util.escapeRegExp 的薄包装（legacy 同名透传）
export const literalizeRegex = (str: string): string => mw.util.escapeRegExp(str);

// legacy String.prototype.entify 的函数化：split/join 链按 & < > " 顺序替换
export const entify = (str: string): string => str.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");

const removeNulls = (val: string | null): boolean => val !== null;

// 拼接 URL 路径段，null 段剔除（legacy 同名）
export const joinPath = (list: (string | null)[]): string => list.filter(removeNulls).join("/");

// String 包装对象也算字符串（legacy instanceof String 分支照搬）
export const isString = (x: unknown): boolean => typeof x === "string" || x instanceof String;

export const isRegExp = (x: unknown): boolean => x instanceof RegExp;

// Identity at runtime; documents that the caller guarantees a non-nullish
// value (an upstream runtime invariant the types cannot carry). Crashes
// exactly where the untyped original would.
export const assume = <T>(value: T | null | undefined): T => value as unknown as T;

export const zeroFill = (n: number, l = 2): string => `${n}`.padStart(l, "0");

export const map = <T, U>(f: (x: T) => U, o: T[] | Record<string, T>): U[] | Record<string, U> => {
    if (Array.isArray(o)) {
        return map_array(f, o);
    }
    return map_object(f, o as Record<string, never>);
};

const map_array = <T, U>(f: (x: T) => U, o: T[]): U[] => {
    const ret: U[] = [];
    for (const item of o) {
        ret.push(f(item));
    }
    return ret;
};

const map_object = <T, U>(f: (x: T) => U, o: Record<string, T>): Record<string, U> => {
    const ret: Record<string, U> = {};
    for (const i in o) {
        // upstream indexes by the object itself (implicit string key); kept verbatim
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- upstream bug kept verbatim: keys by the object itself
        ret[String(o)] = f(o[i]);
    }
    return ret;
};

// legacy pg.escapeQuotesHTML 的函数化：replace 链 & 先行，避免 " 的实体再被
// & 规则级联成 &amp;quot;
export const escapeQuotesHTML = (text: string): string => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// legacy pg.unescapeQuotesHTML 的函数化：浏览器 textarea 惯用法，实体经
// innerHTML 赋值由引擎反解
export const unescapeQuotesHTML = (html: string): string => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};
