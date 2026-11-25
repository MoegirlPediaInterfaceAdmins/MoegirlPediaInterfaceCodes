import fs from "node:fs";
import { Pair, YAMLSeq, parse, parseDocument, stringify } from "yaml";

export const readFile = async (path) => parse(await fs.promises.readFile(path, { encoding: "utf-8" }));
export const writeFile = async (path, value) => await fs.promises.writeFile(path, `${stringify(value).replace(/(?<=\n)([^ \n])/g, "\n$1").trim()}\n`, { encoding: "utf-8" });

/**
 * 读入 YAML 并保留注释、空行与键序（Document API）。
 * 自动生成链路必须走这一对函数，readFile→writeFile 的 parse/stringify 往返会丢弃注释。
 * parseDocument 遇到语法错误不会抛出（只收集在 doc.errors），这里显式抛出，
 * 否则损坏的 YAML 会被静默重写成合法但内容错误的文件。
 * @param { string } path
 * @returns { Promise<import("yaml").Document> }
 */
export const readDocumentFile = async (path) => {
    const doc = parseDocument(await fs.promises.readFile(path, { encoding: "utf-8" }));
    if (doc.errors.length > 0) {
        throw doc.errors[0];
    }
    return doc;
};

/**
 * 写出前把所有非空序列统一为 block 风格：
 * add() 追加到空 flow 序列（[]）时会保持 flow 输出 `[ A ]`，
 * 手写的非空 flow 序列同理；统一在写出处兜底，调用点无需逐个处理。
 * 空序列必须跳过——设 flow=false 后空序列会输出成缩进换行形态（`a:\n  []`），
 * 保留 `[]` 内联写法（仓库 YAML 规范：空数组写作 []）。
 * @param { import("yaml").Node } node
 */
const normalizeSeqFlow = (node) => {
    if (!node || typeof node !== "object") {
        return;
    }
    if (node instanceof YAMLSeq && node.items.length > 0) {
        node.flow = false;
    }
    if (node.items) {
        for (const item of node.items) {
            normalizeSeqFlow(item);
        }
    }
    if (node instanceof Pair) {
        normalizeSeqFlow(node.value);
    }
};

export const writeDocumentFile = async (path, doc) => {
    normalizeSeqFlow(doc.contents);
    await fs.promises.writeFile(path, `${doc.toString().trim()}\n`, { encoding: "utf-8" });
};

/**
 * 把 parent 下 key 处的序列同步为 want（字符串标量序列）：
 * 删除消失的条目、尾部追加新增的条目、既有的条目节点原样不动，
 * 从而保留既有条目旁边的注释；不套用「整体 set」——那会丢掉整个值内部的注释，
 * 也会因来源顺序波动产生纯排序 diff。
 * 仅在发生增删时返回 true，调用方可据此决定是否写入/提交。
 * 键不存在时直接 set 纯数组整建（序列化为 block 风格；此时无既有注释可保）。
 * @template { import("yaml").Document | import("yaml").YAMLMap } T
 * @param { T } parent
 * @param { string } key
 * @param { string[] } want
 * @returns { boolean }
 */
export const syncSeq = (parent, key, want) => {
    const seq = parent.get(key);
    if (!seq) {
        parent.set(key, want);
        return true;
    }
    // YAMLSeq 不是 Array 子类，没有 includes/push/splice，只有 add/delete/get/has/set。
    // 当前值一律经 toJSON() 读取：add() 追加的是原始字符串而非 Scalar 节点，
    // 直接解构 items[].value 会得到 undefined
    const current = seq.toJSON();
    const wantSet = new Set(want);
    let changed = false;
    for (let i = seq.items.length - 1; i >= 0; i--) {
        if (!wantSet.has(current[i])) {
            seq.items.splice(i, 1);
            changed = true;
        }
    }
    const currentSet = new Set(current);
    for (const item of want) {
        if (!currentSet.has(item)) {
            seq.add(item);
            changed = true;
        }
    }
    return changed;
};

export default { readFile, writeFile, readDocumentFile, writeDocumentFile, syncSeq };
