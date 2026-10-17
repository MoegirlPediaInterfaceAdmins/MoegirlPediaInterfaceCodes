// 编辑框选区弹窗域：doSelectionPopup 的 cursor / boxpreview 两模式。
// 行为基准 = legacy src/modules/selpop.ts（commit 02c8dec）的选区部分；
// 同文件的 Mousetracker 类已在 core/mousetracker.ts 承接，不在此重复。
// legacy 在 document.editform / box.parentNode 读取处的 try/catch 只为跨域
// iframe 场景服务——gadget 恒在主文档运行、jsdom 亦不可构造该异常，按
// 「不过度防御」删除（行为无差异，semantic-notes 阶段 5 登记）。
import { mouseOverWikiLink2, runStopPopupTimer } from "./events.ts";
import { popTipsSoonFn } from "./htmlout.ts";
import { wiki2html } from "../preview/insta.ts";
import { getValueOf } from "./options.ts";
import { Title, wiki } from "../title/title.ts";

const getEditboxSelection = (): string => {
    const editbox = document.editform?.wpTextbox1;
    // 旧 IE 的 document.selection 优先于编辑框选区（legacy 回退顺序照搬）
    if (document.selection) {
        return document.selection.createRange().text;
    }
    if (!editbox) {
        return "";
    }
    const selStart = editbox.selectionStart;
    const selEnd = editbox.selectionEnd;
    return editbox.value.substring(selStart, selEnd);
};

export const doSelectionPopup = (): void => {
    const sel = getEditboxSelection();
    const open = sel.indexOf("[[");
    const pipe = sel.indexOf("|");
    const close = sel.indexOf("]]");
    // 运算符优先级怪癖照搬：&& 先于 ||——「无开括号」或「管道闭括号全缺」返回
    if (open === -1 || pipe === -1 && close === -1) {
        return;
    }
    // 管道或闭括号出现在开括号之前：选区不是链接前缀，返回
    if (pipe !== -1 && open > pipe || close !== -1 && open > close) {
        return;
    }
    const article = new Title(sel.substring(open + 2, pipe < 0 ? close : pipe));
    if (getValueOf("popupOnEditSelection") === "boxpreview") {
        doSeparateSelectionPopup(sel);
        return;
    }
    // 只防「首个闭括号之后还残留 [[」的一层多链接怪癖（legacy 原样）
    if (close > 0 && sel.substring(close + 2).includes("[[")) {
        return;
    }
    const a = document.createElement("a");
    a.href = wiki.titlebase + article.urlString();
    mouseOverWikiLink2(a);
    const navpop = a.navpopup;
    if (navpop) {
        // 合成锚点没有真实 mouseout 流——unhide 后挂停止计时器维持驻留语义
        navpop.addHook(() => {
            runStopPopupTimer(navpop);
        }, "unhide", "after");
    }
};

const doSeparateSelectionPopup = (str: string): void => {
    let div = document.getElementById("selectionPreview");
    if (!div) {
        div = document.createElement("div");
        div.id = "selectionPreview";
        const box = document.editform?.wpTextbox1;
        if (!box?.parentNode) {
            return;
        }
        box.parentNode.insertBefore(div, box);
    }
    div.innerHTML = wiki2html(str);
    div.ranSetupTooltipsAlready = false;
    popTipsSoonFn("selectionPreview")();
};
