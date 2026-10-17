// 结构域：7 种弹窗结构（original/nostalgia/fancy/fancy2/menus/shortmenus/lite）
// 的布局槽序、重定向槽表与槽填充器映射。行为基准 = legacy domdrag.ts 顶部的
// original 结构定义 + structures.ts 的 copyStructure 派生表（commit 02c8dec）。
//
// 解耦约定（.zcode/rewrite-plan.md §4.1 的「模块顶层零副作用」在跨域上的
// 推广）：legacy 把各结构的槽填充器（popupTitle/popupTopLinks 等 navlinks DSL
// 渲染与 popupImage 图片骨架）直接内联在结构对象上，使结构域反向依赖
// navlinks/preview 域；重写版的结构表只声明「槽名 → 填充器注册表键」绑定
// （键约定 `${结构名}.${槽名}`），navlinks（阶段 4）与 preview（阶段 2/3）域
// 稍后经 registerSlotFiller 注册实现。未注册的槽在 fillEmptySpans 中跳过——
// 与 legacy 结构对象缺该槽函数时的 continue 路径等价。
import type { Title } from "../title/title.ts";

// 布局项：槽名，或嵌套槽组（渲染时插入前一槽容器内部，见 htmlout.makeEmptySpans）
export type LayoutItem = string | LayoutItem[];

// 本域所需的弹窗参数最小结构面（不 import 并行开发中的 Navpopup 类）：
// - idNumber：槽 id 后缀（popup<槽名><idNumber> 契约）
// - parentAnchor：fillEmptySpans 解析 article/hint/params 的来源锚点
// - hasPopupMenu：menus 结构填充器（navlinks 域）在弹窗上维护的「popups 菜单
//   已建」标记（legacy Navpopup.hasPopupMenu），本域不读写，仅为阶段 4 契约
//   阶段 3 events 集成时以真 Navpopup 对接（结构兼容即可）。
export interface PopupLike {
    idNumber: number;
    parentAnchor: HTMLAnchorElement | null;
    hasPopupMenu?: boolean;
}

// 填充器入参（legacy StructureContext）：article/hint/oldid/rcid/params 由
// htmlout.fillEmptySpans 从锚点（或重定向目标）解析装配。
export interface StructureContext {
    article: Title;
    hint: string | null;
    // legacy：无 oldid 查询参数时原样透传 undefined（仅 popupHistoricalLinks
    // 关闭时显式置 null），两条路径对 navlinks 域语义不同，勿归一化
    oldid: string | null | undefined;
    rcid: string | null | undefined;
    navpop: PopupLike;
    params: Record<string, string | null | undefined>;
}

// 槽填充器：返回 HTML 串或 DOM 节点（null/undefined = 不写入）
export type SlotFiller = (x: StructureContext) => string | Node | null;

export interface PopupStructure {
    popupLayout: () => LayoutItem[];
    // 重定向态（fillEmptySpans 的 redir=true）需要填充的槽名表；lite 无此表
    popupRedirSpans?: () => string[];
    // 槽名 → 填充器注册表键；copyStructure 派生时整表拷贝后按结构覆盖。
    // Partial 反映「布局中的槽未必有绑定」这一真实形态（fillEmptySpans 对
    // 无绑定槽按 legacy 缺结构函数路径跳过）；键查不到实现（未注册）时
    // 同样跳过。
    slots: Partial<Record<string, string>>;
}

// 7 种结构定义表 = legacy pg.structures；顶层构建属纯数据定义，符合
// 「结构定义表是纯数据」的豁免（.zcode/rewrite-plan.md §4.1）
export const structures: Record<string, PopupStructure> = {};

// copyStructure 语义照搬（legacy structures.ts）：新结构逐项复制旧结构的全部
// 属性（布局、重定向槽表、槽键映射），随后由派生处覆盖差异项。slots 映射
// 需多拷一层——legacy 的属性级复制天然各持一份，浅展开会把派生结构的槽键
// 覆盖写穿回基结构。
const copyStructure = (oldStructure: string, newStructure: string): void => {
    structures[newStructure] = {
        ...structures[oldStructure],
        slots: { ...structures[oldStructure].slots },
    };
};

// original（legacy domdrag.ts 顶部）：布局槽序与重定向槽表是 DOM/CSS 契约
// 冻结点（docs/functional-spec.md §14），逐项照搬勿改。
structures.original = {
    popupLayout: () => [
        "popupError",
        "popupImage",
        "popupTopLinks",
        "popupTitle",
        "popupUserData",
        "popupData",
        "popupOtherLinks",
        "popupRedir",
        ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
        "popupMiscTools",
        ["popupRedlink"],
        "popupPrePreviewSep",
        "popupPreview",
        "popupSecondPreview",
        "popupPreviewMore",
        "popupPostPreview",
        "popupFixDab",
    ],
    popupRedirSpans: () => ["popupRedir", "popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
    slots: {
        popupTitle: "original.popupTitle",
        popupTopLinks: "original.popupTopLinks",
        popupImage: "original.popupImage",
        // legacy：popupRedirTitle/popupRedirTopLinks 与非 redir 版指向同一函数
        popupRedirTitle: "original.popupTitle",
        popupRedirTopLinks: "original.popupTopLinks",
    },
};

// nostalgia：保留 original 布局，TopLinks 换怀旧式平铺链接串（redir 版同实现）
copyStructure("original", "nostalgia");
structures.nostalgia.slots.popupTopLinks = "nostalgia.popupTopLinks";
structures.nostalgia.slots.popupRedirTopLinks = "nostalgia.popupTopLinks";

// fancy：Title/TopLinks/OtherLinks 三槽换 fancy 变体（redir 版各自同实现），
// 布局与 popupImage 仍继承 original
copyStructure("original", "fancy");
structures.fancy.slots.popupTitle = "fancy.popupTitle";
structures.fancy.slots.popupTopLinks = "fancy.popupTopLinks";
structures.fancy.slots.popupOtherLinks = "fancy.popupOtherLinks";
structures.fancy.slots.popupRedirTitle = "fancy.popupTitle";
structures.fancy.slots.popupRedirTopLinks = "fancy.popupTopLinks";
structures.fancy.slots.popupRedirOtherLinks = "fancy.popupOtherLinks";

// fancy2：从 fancy 派生，仅 TopLinks 换带前导 <br> 的变体（navlinks 域注册时
// 包裹 fancy.popupTopLinks 实现），布局把 Title 前移到 TopLinks 之前
copyStructure("fancy", "fancy2");
structures.fancy2.popupLayout = () => [
    "popupError",
    "popupImage",
    "popupTitle",
    "popupUserData",
    "popupData",
    "popupTopLinks",
    "popupOtherLinks",
    "popupRedir",
    ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
    "popupMiscTools",
    ["popupRedlink"],
    "popupPrePreviewSep",
    "popupPreview",
    "popupSecondPreview",
    "popupPreviewMore",
    "popupPostPreview",
    "popupFixDab",
];
structures.fancy2.slots.popupTopLinks = "fancy2.popupTopLinks";

// menus：布局把 TopLinks 提到 Title 前（菜单式顶链先于标题渲染——functional-
// spec §3 的 menus 系槽序调整），数据槽后移；TopLinks 换下拉菜单变体（填充器
// 带 shorter 形参，shortmenus 经由 navlinks 域注册时以 shorter=true 包裹实现）
copyStructure("original", "menus");
structures.menus.popupLayout = () => [
    "popupError",
    "popupImage",
    "popupTopLinks",
    "popupTitle",
    "popupOtherLinks",
    "popupRedir",
    ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
    "popupUserData",
    "popupData",
    "popupMiscTools",
    ["popupRedlink"],
    "popupPrePreviewSep",
    "popupPreview",
    "popupSecondPreview",
    "popupPreviewMore",
    "popupPostPreview",
    "popupFixDab",
];
structures.menus.slots.popupTopLinks = "menus.popupTopLinks";
structures.menus.slots.popupRedirTopLinks = "menus.popupTopLinks";

// shortmenus（默认结构）：menus 布局 + 简化版 TopLinks（redir 版同实现）；
// popupRedirTitle 保持继承 original.popupTitle——legacy 别名到 menus.popupTitle，
// 而后者正是从 original 复制来的那份
copyStructure("menus", "shortmenus");
structures.shortmenus.slots.popupTopLinks = "shortmenus.popupTopLinks";
structures.shortmenus.slots.popupRedirTopLinks = "shortmenus.popupTopLinks";

// lite：极简结构，仅 Title 与 Preview 两槽，无重定向槽表（fillEmptySpans 的
// redir 态因此无槽可填）
structures.lite = {
    popupLayout: () => ["popupTitle", "popupPreview"],
    slots: {
        popupTitle: "lite.popupTitle",
    },
};

// 槽填充器注册表：键即结构表 slots 声明的 `${结构名}.${槽名}`（或其他自定义
// 名——多个结构槽可共享同一实现键，legacy 的同函数别名即此模式）
const slotFillers = new Map<string, SlotFiller>();

export const registerSlotFiller = (name: string, filler: SlotFiller): void => {
    slotFillers.set(name, filler);
};

export const getSlotFiller = (name: string): SlotFiller | undefined => slotFillers.get(name);

// 布局深度优先展平（legacy htmloutput.ts 的 flatten：嵌套组按出现序内联）
export const flattenLayout = (list: LayoutItem[]): string[] => {
    const ret: string[] = [];
    for (const item of list) {
        if (typeof item === "string") {
            ret.push(item);
        } else {
            ret.push(...flattenLayout(item));
        }
    }
    return ret;
};
