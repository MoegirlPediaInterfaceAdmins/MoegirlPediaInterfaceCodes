// 预览生成域：Previewmaker 类——wikitext 清洗管线（kill* 系列）、
// maxSentences/maxCharacters 摘要截取（firstBit）、makePreview / showPreview /
// editSummaryPreview。行为基准 = legacy src/modules/previewmaker.ts
// （commit 02c8dec）。
//
// pg 动态域映射：pg.option→core/options、pg.string→core/strings、
// pg.nsXxxId→title/namespaces 的 nsState、pg.escapeQuotesHTML→core/tools、
// Insta.conf.paths.articles 与 pg.wiki.articlePath→instaConf（后者已含尾
// 斜杠，内插后与 legacy 的 `${articlePath}/` 逐字相同）。
//
// 与 legacy 的实现差异（不可达防御分支删除，见各处注释）：
// - makeRegexp 的第三类入参 log 兜底（调用面只有 string | RegExp）与从未
//   传入的 _suffix 形参
// - firstBit 对 exec 结果的判空（模式可空匹配，恒命中）
// - showPreview 的 `typeof html !== typeof ""` 检查（唯一赋值点是
//   makePreview 里 wiki2html 的 string 返回值，之后恒为 string；空串情形由
//   空白正则同等拦截）
import { instaConf, wiki2html } from "./insta.ts";
import { setPopupHTML, setPopupTipsAndHTML, type PopData } from "../core/htmlout.ts";
import { log } from "../core/log.ts";
import { getValueOf } from "../core/options.ts";
import { popupString } from "../core/strings.ts";
import { assume, escapeQuotesHTML, literalizeRegex } from "../core/tools.ts";
import type { Navpopup } from "../core/popup.ts";
import { nsState } from "../title/namespaces.ts";
import { Title, parenSplit } from "../title/title.ts";

// Previewmaker 需要的宿主弹窗面：article 由 events/actions 域装配到弹窗上
// （legacy 同款分工；重写版 Navpopup 尚未声明该字段，预览管线阶段补齐后此
// 扩展接口即其形状）
export interface PreviewOwner extends Navpopup {
    article?: Title;
}

export class Previewmaker {
    maxCharacters = +(getValueOf("popupMaxPreviewCharacters") as string | number);
    maxSentences = +(getValueOf("popupMaxPreviewSentences") as string | number);
    originalData!: string;
    // Title 会经 APIsharedImagePagePreviewHTML 混入（上游把条目当 URL 位传）；
    // 直落 wiki2html / Title.fromURL 后各自按串化 / 非串路径处理（legacy 原样）
    baseUrl!: string | Title;
    // exactOptionalPropertyTypes：构造器的可选 owner 会整体拷贝（含 undefined）
    owner?: PreviewOwner | undefined;
    data!: string;
    html?: string;
    fullLength = 0;

    constructor(wikiText: string, baseUrl: string | Title, owner?: PreviewOwner) {
        this.originalData = wikiText;
        this.baseUrl = baseUrl;
        this.owner = owner;
        this.setData();
    }

    setData(): void {
        // 截断下限 1e4：短上限时也要保留足够上下文给 anchorize 定位与
        // more... 扩容重算（legacy 同款取 max）
        const maxSize = Math.max(1e4, 2 * this.maxCharacters);
        this.data = this.originalData.substring(0, maxSize);
    }

    killComments(): void {
        // 字符类 [^$] 是 legacy 原样怪癖（本意疑为 [^>]）：注释体内含 $ 时不删；
        // 换行在字符类内，跨行注释照删——照搬勿修
        this.data = this.data.replace(/^<!--[^$]*?-->\n|\n<!--[^$]*?-->(?=\n)|<!--[^$]*?-->/g, "");
    }

    killDivs(): void {
        // < *div 与 < *\/ *div 容忍标签内空格；[\s\S]*? 最短闭合（嵌套 div 只
        // 杀首个最短段，外层闭标签残留——legacy 原样）
        this.data = this.data.replace(/< *div[^>]* *>[\s\S]*?< *\/ *div *>/ig, "");
    }

    killGalleries(): void {
        this.data = this.data.replace(/< *gallery[^>]* *>[\s\S]*?< *\/ *gallery *>/ig, "");
    }

    kill(opening: string | RegExp, closing: string | RegExp, subopening?: string | RegExp, subclosing?: string | RegExp, repl?: string): void {
        // 反复重杀直到长度不再缩短（一次 killStuff 只处理首个配平段）
        let oldk = this.data;
        let k = this.killStuff(this.data, opening, closing, subopening, subclosing, repl);
        while (k.length < oldk.length) {
            oldk = k;
            k = this.killStuff(k, opening, closing, subopening, subclosing, repl);
        }
        this.data = k;
    }

    killStuff(_txt: string, opening: string | RegExp, closing: string | RegExp, subopening?: string | RegExp, subclosing?: string | RegExp, repl?: string): string {
        let txt = _txt;
        const op = this.makeRegexp(opening);
        // 闭/子开/子闭都锚定到剩余串行首（^），逐字符推进扫描
        const cl = this.makeRegexp(closing, "^");
        const sb = subopening ? this.makeRegexp(subopening, "^") : null;
        const sc = subclosing ? this.makeRegexp(subclosing, "^") : cl;

        if (!op.test(txt)) {
            return txt;
        }
        const opResult = assume(op.exec(txt));
        const ret = txt.substring(0, opResult.index);
        txt = txt.substring(opResult.index + opResult[0].length);
        let depth = 1;
        while (txt.length > 0) {
            let removal = 0;
            if (depth === 1 && cl.test(txt)) {
                depth--;
                removal = assume(cl.exec(txt))[0].length;
            } else if (depth > 1 && sc.test(txt)) {
                depth--;
                removal = assume(sc.exec(txt))[0].length;
            } else if (sb?.test(txt)) {
                depth++;
                removal = assume(sb.exec(txt))[0].length;
            }
            if (!removal) {
                removal = 1;
            }
            txt = txt.substring(removal);
            if (depth === 0) {
                break;
            }
        }
        return ret + (repl ?? "") + txt;
    }

    makeRegexp = (x: string | RegExp, _prefix?: string): RegExp => {
        const prefix = _prefix ?? "";
        let reStr: string;
        let flags = "";
        // typeof 判定在 string | RegExp 二值域与 legacy 的 isString 等价，且
        // 完成类型收窄（isString 非类型守卫）；legacy 对第三类入参的 log
        // 兜底不可达，按「不过度防御」删除。正则入参经 toString 拆出源与
        // 标志重建（legacy 原样拆法，源内含 "/" 会拆坏——全部调用点都不含）
        if (typeof x === "string") {
            reStr = prefix + literalizeRegex(x);
        } else {
            let s = x.toString().substring(1);
            const sp = s.split("/");
            flags = sp[sp.length - 1];
            sp[sp.length - 1] = "";
            s = sp.join("/");
            s = s.substring(0, s.length - 1);
            reStr = prefix + s;
        }
        log(`makeRegexp: got reStr=${reStr}, flags=${flags}`);
        return RegExp(reStr, flags);
    };

    killBoxTemplates(): void {
        // box 类成对模板：begin/start 开标记（后缀参数须 <code>[_ ]</code> 分隔，
        // "float box begin" 这类空格复合名命中）与 infobox/elementbox/frame
        // 前缀模板；subopening "{{" 让嵌套模板参与配平
        this.kill(/[{][{][^{}\s|]*?(float|box)[_ ](begin|start)/i, /[}][}]\s*/, "{{");
        this.kill(/[{][{][^{}\s|]*?(infobox|elementbox|frame)[_ ]/i, /[}][}]\s*/, "{{");
    }

    killTemplates(): void {
        // 单花括号 { } 也计入深度（MW 的 {{{参数}}} 与嵌套模板由此配平）；
        // 删除处补一个空格防止前后词粘连
        this.kill("{{", "}}", "{", "}", " ");
    }

    killTables(): void {
        this.kill("{|", /[|]}\s*/, "{|");
        this.kill(/<table.*?>/i, /<\/table.*?>/i, /<table.*?>/i);
        // 逃逸的表格行（整行以 | 开头）整行删
        this.data = this.data.replace(RegExp("^[|].*$", "mg"), "");
    }

    killImages(): void {
        // 动态收集 File/Category 命名空间的全部本地化别名（wgNamespaceIds 的
        // 键，空格放宽为 [ _]），别名外（如 Template:）的 [[]] 链接不受影响
        const forbiddenNamespaceAliases: string[] = [];
        for (const [localizedNamespaceLc, namespaceId] of Object.entries(mw.config.get("wgNamespaceIds"))) {
            if (namespaceId !== nsState.imageId && namespaceId !== nsState.categoryId) {
                continue;
            }
            forbiddenNamespaceAliases.push(localizedNamespaceLc.split(" ").join("[ _]"));
        }
        this.kill(RegExp(`[[][[]\\s*(${forbiddenNamespaceAliases.join("|")})\\s*:`, "i"), /\]\]\s*/, "[", "]");
    }

    killHTML(): void {
        this.kill(/<ref\b[^/>]*?>/i, /<\/ref>/i);
        // 行首（可带空格）的标签行整行折叠为换行：该行余文一并丢弃（legacy
        // 原样）；自闭合 <ref .../> 不匹配上方 kill 的开标记（[^/>] 排除 /），
        // 由下方标签清空兜住
        this.data = this.data.replace(/(^|\n) *<.*/g, "\n");
        // 捕获组切出 <...> 形态的片段（|$/|(?=<) 让未闭合标签也成段）；白名单
        // 外的标签清空、内容保留
        const splitted = parenSplit(this.data, /(<[\w\W]*?(?:>|$|(?=<)))/);
        const len = splitted.length;
        for (let i = 1; i < len; i = i + 2) {
            switch (splitted[i]) {
                case "<nowiki>":
                case "</nowiki>":
                case "<blockquote>":
                case "</blockquote>":
                    break;
                default:
                    splitted[i] = "";
            }
        }
        this.data = splitted.join("");
    }

    killChunks(): void {
        // 斜体引语块：行首（可带冒号缩进）的 ''…'' 且内文 ≥20 个非引号单元，
        // 整块（可多行连续）替换为换行——quote 堆砌的劝退文风清理
        const italicChunkRegex = /((^|\n)\s*:*\s*''[^']([^']|'''|'[^']){20}(.|\n[^\n])*''[.!?\s]*\n)+/g;
        this.data = this.data.replace(italicChunkRegex, "\n");
    }

    mopup(): void {
        this.data = this.data.replace(/^-{4,}/mg, "");
        // 冒号引导的行（讨论页缩进回复）连同前导换行一起删
        this.data = this.data.replace(/(^|\n) *:[^\n]*/g, "");
        // 独占一行的魔术字（大小写不敏感）
        this.data = this.data.replace(/^__[A-Z_]*__ *$/img, "");
    }

    firstBit(): void {
        let d: string | string[] = this.data;
        if (getValueOf("popupPreviewCutHeadings")) {
            // 标题两侧补空行并加尾空格 → 定义行后连续空行折回单换行 → 去前导
            // 空白，再取「首段」：无空行分隔的相邻行属同段（\n 后须非空白行）
            this.data = this.data.replace(/\s*(==+[^=]*==+)\s*/g, "\n\n$1 ");
            this.data = this.data.replace(/([:;]) *\n{2,}/g, "$1\n");
            this.data = this.data.replace(/^[\s\n]*/, "");
            // 模式可空匹配、exec 恒命中（legacy 判空是不可达防御，assume 收敛）
            d = assume(/^([^\n]|\n[^\n\s])*/.exec(this.data))[0];
            if (!getValueOf("popupPreviewFirstParOnly")) {
                d = this.data;
            }
            // 取出的段内标题改回标题后补空行（供 wiki2html 分块）
            d = d.replace(/(==+[^=]*==+)\s*/g, "$1\n\n");
        }
        // 按句切分：句尾标点（可带引号）+尾随空白作为分隔符保留在句内
        d = parenSplit(d, /([!?.]+["']*\s)/g);
        d[0] = d[0].replace(/^\s*/, "");
        // 非句尾判定：小写字母句点接小写（缩写）、常见头衔/拉丁缩写、未闭合
        // 方括号、空格后的单个大写/罗马数字字位（"word I"）
        const notSentenceEnds = /([^.][a-z][.] *[a-z]|etc|sic|Dr|Mr|Mrs|Ms|St|no|op|cit|\[[^\]]*|\s[A-Zvclm])$/i;
        d = this.fixSentenceEnds(d, notSentenceEnds);
        this.fullLength = d.join("").length;
        // 句数预算内尽量多带句子；超字符预算则逐句回退，n 归零时保留超长首句
        // （legacy 原样——宁可超长不出空预览）
        let n = this.maxSentences;
        let dd: string;
        do {
            dd = this.firstSentences(d, n);
            --n;
        } while (dd.length > this.maxCharacters && n !== 0);
        this.data = dd;
    }

    fixSentenceEnds(strs: string[], reg: RegExp): string[] {
        // 误判的句界（strs[i] 以非句尾收束）连同其后两段并回前句，递归重查
        for (let i = 0; i < strs.length - 2; ++i) {
            if (reg.test(strs[i])) {
                const a: string[] = [];
                for (let j = 0; j < strs.length; ++j) {
                    if (j < i) {
                        a[j] = strs[j];
                    }
                    if (j === i) {
                        a[i] = strs[i] + strs[i + 1] + strs[i + 2];
                    }
                    if (j > i + 2) {
                        a[j - 2] = strs[j];
                    }
                }
                return this.fixSentenceEnds(a, reg);
            }
        }
        return strs;
    }

    firstSentences = (strs: string[], howmany: number): string => {
        // 切片元素数 = 2*句数：每句 = 正文段 + 分隔符段
        const t = strs.slice(0, 2 * howmany);
        return t.join("");
    };

    killBadWhitespace(): void {
        // 残留的纯引号/空格行清掉
        this.data = this.data.replace(/^ *'+ *$/gm, "");
    }

    makePreview(): void {
        // Template/File 名字空间只 killHTML：源码即内容的页面保留 wiki 标记
        if (this.owner?.article?.namespaceId() !== nsState.templateId && this.owner?.article?.namespaceId() !== nsState.imageId) {
            this.killComments();
            this.killDivs();
            this.killGalleries();
            this.killBoxTemplates();
            if (getValueOf("popupPreviewKillTemplates")) {
                this.killTemplates();
            } else {
                this.killMultilineTemplates();
            }
            this.killTables();
            this.killImages();
            this.killHTML();
            this.killChunks();
            this.mopup();
            this.firstBit();
            this.killBadWhitespace();
        } else {
            this.killHTML();
        }
        this.html = wiki2html(this.data, this.baseUrl as string);
        this.fixHTML();
        this.stripLongTemplates();
    }

    esWiki2HtmlPart = (data: string): string => {
        // 编辑摘要内的 [[目标|标签]]（无管道则用目标）渲染 + 尾随 [a-z]* 吸附
        // 进链文本；重复捕获组 (?:\|…)* 只留最后一个管道段（legacy 原样）
        const reLinks = /(?:\[\[([^|\]]*)(?:\|([^|\]]*))*]]([a-z]*))/gi;
        reLinks.lastIndex = 0;
        let result = "";
        let postfixIndex = 0;
        let match = reLinks.exec(data);
        while (match) {
            result += `${escapeQuotesHTML(data.substring(postfixIndex, match.index))}<a href="${instaConf.paths.articles}${escapeQuotesHTML(match[1])}">${escapeQuotesHTML((match[2] ? match[2] : match[1]) + match[3])}</a>`;
            postfixIndex = reLinks.lastIndex;
            match = reLinks.exec(data);
        }
        result += escapeQuotesHTML(data.substring(postfixIndex));
        return result;
    };

    editSummaryPreview(): string {
        // /* 章节 */ 格式（MediaWiki 编辑摘要的章节自动注释）拆为前后缀 + 章节
        // 锚点链接；sectionLink 用 Insta 条目基址 + 标题（omitAnchor）+ 锚点
        const reAes = /\/\* *(.*?) *\*\//g;
        reAes.lastIndex = 0;
        const match = reAes.exec(this.data);
        if (match) {
            // prefix 取到 match.index-1：把章节标记前的空格留给前缀渲染
            const prefix = this.data.substring(0, match.index - 1);
            const section = match[1];
            const postfix = this.data.substring(reAes.lastIndex);
            let start = "<span class='autocomment'>";
            let end = "</span>";
            if (prefix.length > 0) {
                start = `${this.esWiki2HtmlPart(prefix)} ${start}- `;
            }
            if (postfix.length > 0) {
                end = `: ${end}${this.esWiki2HtmlPart(postfix)}`;
            }
            const t = new Title().fromURL(this.baseUrl);
            t.anchorFromUtf(section);
            const sectionLink = `${instaConf.paths.articles + escapeQuotesHTML(t.toString(true))}#${escapeQuotesHTML(t.anchor)}`;
            return `${start}<a href="${sectionLink}">&rarr;</a> ${escapeQuotesHTML(section)}${end}`;
        }
        return this.esWiki2HtmlPart(this.data);
    }

    fixHTML(): void {
        if (!this.html) {
            return;
        }
        // 条目名内的 ? 与 URL 查询串语义冲突，转义为 %3F（双/单引号两种 href
        // 形态各一条）；instaConf.paths.articles 已含尾斜杠，内插后与 legacy 的
        // `${pg.wiki.articlePath}/` 逐字相同
        let ret = this.html;
        ret = ret.replace(RegExp(`(<a href="${instaConf.paths.articles}[^"]*)[?](.*?")`, "g"), "$1%3F$2");
        ret = ret.replace(RegExp(`(<a href='${instaConf.paths.articles}[^']*)[?](.*?')`, "g"), "$1%3F$2");
        this.html = ret;
    }

    showPreview(): void {
        this.makePreview();
        // legacy 此处曾有 `typeof html !== typeof ""` 提前返回：makePreview 后
        // html 恒为 string（唯一赋值点是 wiki2html 的返回值），该分支不可达，
        // 按「不过度防御」删除；空串由下方空白正则同等拦截
        if (RegExp("^\\s*$").test(assume(this.html))) {
            return;
        }
        setPopupHTML("<hr />", "popupPrePreviewSep", this.owner?.idNumber);
        // exactOptionalPropertyTypes 下显式 undefined 不能进可选属性：
        // owner 缺省时传 undefined（消费方读 popData?.owner，两形态等价）
        setPopupTipsAndHTML(this.html, "popupPreview", this.owner?.idNumber, this.owner ? ({ owner: this.owner } as PopData) : undefined);
        const more = this.fullLength > this.data.length ? this.moreLink() : "";
        setPopupHTML(more, "popupPreviewMore", this.owner?.idNumber);
    }

    moreLink(): HTMLAnchorElement {
        const a = document.createElement("a");
        a.className = "popupMoreLink";
        a.innerHTML = popupString("more...");
        a.onclick = () => {
            // more...：扩容 +2000 字符 / +20 句后从头重算重渲
            this.maxCharacters += 2e3;
            this.maxSentences += 20;
            this.setData();
            this.showPreview();
        };
        return a;
    }

    stripLongTemplates(): void {
        // 开头 1000 字符内的未渲染长模板（含 2+ 相邻 p/br 标签）剥除，防止占屏
        this.html = assume(this.html).replace(/^.{0,1000}[{][{][^}]*?(<(p|br)( \/)?>\s*){2,}([^{}]*?[}][}])?/ig, "");
        this.html = assume(this.html).split("\n").join(" ");
        this.html = assume(this.html).replace(/[{][{][^}]*<pre>[^}]*[}][}]/ig, "");
    }

    killMultilineTemplates(): void {
        // popupPreviewKillTemplates=false 的保守路径：只杀三重大括号参数块与
        // 开标记跨行的模板，单行模板保留展示
        this.kill("{{{", "}}}");
        this.kill(/\s*[{][{][^{}]*\n/, "}}", "{{");
    }
}
