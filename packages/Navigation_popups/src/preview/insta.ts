// InstaView wiki2html 解析引擎：wikitext → HTML 字符串。
// 行为基准 = legacy src/modules/livepreview.ts（commit 02c8dec），输出经
// tests/unit/preview/insta.test.ts 逐字节对照锁死（期望值由 legacy 拷贝的
// 对照 harness 推导）。
//
// 引擎是纯解析器：不读任何全局（mw / $ / window），站点配置经 setupLivePreview
// 显式注入（legacy 读 pg 动态域的部分全部参数化），子页面基址经 wiki2html
// 第二参注入。模块顶层零副作用。
//
// 与 legacy 的实现差异（行为不可见或死代码，均已登记重写日志）：
// - legacy 的 conf 死配置删除：wiki.lang / wiki.default_thumb_width /
//   paths.math / paths.images / paths.images_fallback / locale.user /
//   user.signature（解析路径从不读取）
// - legacy parse_image 的 attr 解析在 return "" 前全部丢弃，无用户可见效
//   果，整体删除
// - legacy Insta.dump / $.inArray 依赖删除（dump 无调用点；inArray 的
//   truthy 语义见 parse_list 注释）
// - f() 的 "??" 字面量转义分支删除（全部调用点模板都不含 "??"）

/** 站点配置：boot 在 setupPopups 时序里按站点实参注入（legacy 读 pg.*） */
export interface InstaSiteConfig {
    /**
     * 条目路径前缀 = wgArticlePath 去掉 /$1 尾缀（如 "/wiki"）。
     * 内链 href 统一拼为 `${articlePath}/目标`（legacy pg.wiki.articlePath + "/"）
     */
    articlePath: string;
    /**
     * 〔萌百〕interwiki 前缀表（zh 站为 "en|ja"，见 title/namespaces 的
     * setInterwiki）。表外语言不设置——undefined 经模板串化为 "undefined"，
     * 构造出的正则永不匹配（legacy 原样）
     */
    interwiki: string | undefined;
    /** File 命名空间本地化显示名（wgFormattedNamespaces[nsImageId]） */
    imageNamespace: string;
    /** Category 命名空间本地化显示名（wgFormattedNamespaces[nsCategoryId]） */
    categoryNamespace: string;
}

/** 运行时引擎配置（legacy InstaView.conf 的活字段） */
export interface InstaConf {
    /** 子页面链接基址：wiki2html 每次调用重置（不传 = undefined） */
    baseUrl: string | undefined;
    paths: {
        /** 条目链接前缀（"/wiki/"）；previewmaker 按 legacy Insta.conf.paths.articles 读 */
        articles: string;
    };
    wiki: {
        /** interwiki 前缀表（可 undefined，语义见 InstaSiteConfig.interwiki） */
        interwiki: string | undefined;
    };
    locale: {
        image: string;
        category: string;
        /** 签名时间戳月缩写：legacy 硬编码英文，不随站点语言本地化（照搬勿修） */
        months: string[];
    };
    user: {
        /**
         * 签名占位用户名。legacy setupLivePreview 从不读 wgUserName，恒为
         * "Wikipedian"（照搬勿修——弹窗预览里 ~~~ 的署名本来就是占位符）
         */
        name: string;
    };
}

// 以稳定对象引用导出：previewmaker（后续 preview 域模块）按 legacy
// `Insta.conf.paths.articles` 的读法拼条目链接
export const instaConf: InstaConf = {
    baseUrl: "",
    paths: { articles: "" },
    wiki: { interwiki: undefined },
    locale: {
        image: "",
        category: "",
        months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
    user: { name: "" },
};

// 块级图片行识别（"[[File:…|…thumb/right/…" 开头的行整行吞掉）；按
// locale.image 装配，setupLivePreview 前未定义——与 legacy 未装配即崩溃一致
// （不过度防御）
let BLOCK_IMAGE: RegExp;

export const setupLivePreview = (site: InstaSiteConfig): void => {
    instaConf.baseUrl = "";
    instaConf.paths.articles = `${site.articlePath}/`;
    instaConf.wiki.interwiki = site.interwiki;
    instaConf.locale.image = site.imageNamespace;
    instaConf.locale.category = site.categoryNamespace;
    instaConf.user.name = "Wikipedian";
    BLOCK_IMAGE = new RegExp(`^\\[\\[(?:File|Image|${site.imageNamespace}):.*?\\|.*?(?:frame|thumbnail|thumb|none|right|left|center)`, "i");
};

export const wiki2html = (txt: string, baseurl?: string): string => {
    // 不带 baseurl 的调用会把 baseUrl 重置回 undefined——子页面链接随之渲染
    // href="undefined/..."（legacy 原样怪癖，测试锁定）
    instaConf.baseUrl = baseurl;
    return convert(txt);
};

// 与 title.ts 同义的恒等断言：调用方担保 match/exec 必命中（分支入口的正则
// 前置条件），未命中时与 legacy 一样在原处崩溃，不做兜底（不过度防御）
const assume = <T>(value: T | null | undefined): T => value as unknown as T;

const convert = (wiki: string | string[]): string => {
    // CR 归一 + 按行切分；数组入参来自表格单元格的递归
    const ll = typeof wiki === "string" ? wiki.replace(/\r/g, "").split(/\n/) : wiki;
    let o = "";
    // 段落状态：0 = 段外，1 = 段内，true = 本空行已发 <p><br>（legacy 单变量复用）
    let p: number | boolean = 0;
    const ps = (s: string): void => {
        o += s;
    };
    // 调用点都保证队列非空，shift 永不返回 undefined——legacy 的 `?? ""` 兜底
    // 是死分支，已删
    const sh = (): string => assume(ll.shift());

    // legacy 的 ?: 占位格式化：模板中的 "?" 依序替换为参数；占位符先用尽则
    // 提前中断（f("<table>", attr) 的 attr 因此恒被丢弃），参数先用尽则剩余
    // "?" 原样保留。legacy 另支持 "??" 转义字面量，但无调用点用到，已删
    const f = (template: string, ...args: unknown[]): string => {
        let rest = template;
        let out = "";
        for (const arg of args) {
            const pos = rest.indexOf("?");
            if (pos === -1) {
                break;
            }
            out += rest.substring(0, pos) + String(arg);
            rest = rest.slice(pos + 1);
        }
        return out + rest;
    };

    // & 先转义：已转义实体（"&lt;"）会二次转义为 "&amp;lt;"（legacy 原样）
    const html_entities = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // 链接文本/目标转义：不转义 &（"&" 直落 href，legacy 原样）；: [ ] 数字
    // 实体转义防方括号语法串味
    const htmlescape_text = (s: string): string => s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/:/g, "&#58;").replace(/\[/g, "&#91;").replace(/]/g, "&#93;");
    const htmlescape_attr = (s: string): string => htmlescape_text(s).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

    // 两标记串的最长公共前缀长度（列表切换时定位共同层级）
    const str_imatch = (a: string, b: string): number => {
        const l = Math.min(a.length, b.length);
        let i;
        for (i = 0; i < l; i++) {
            if (a.charAt(i) !== b.charAt(i)) {
                break;
            }
        }
        return i;
    };

    const charAtPoint = (pos: number): string => ll[0].charAt(pos);

    const endl = (s: string): void => {
        ps(s);
        sh();
    };

    const parse_list = (): void => {
        let prev = "";
        while (ll.length) {
            const m = /^([*#:;]+)(.*)$/.exec(ll[0]);
            if (!m) {
                break;
            }
            sh();
            const ipos = str_imatch(prev, m[1]);
            // 闭合 prev 比 ipos 长出的层级（从深到浅）。第三分支的 legacy 写法
            // 是 $.inArray(当前行标记.charAt(prevPos), ["", "*", "#"]) 作 truthy：
            // 命中 "*"（下标 1）/"#"（2）为真，越界空串 ""（0）为假，其余字符
            // （":"/";"）得 -1 同样为真——即「当前行标记串延伸到该位置」就闭合
            // </dl>（跨类型切换时先关后开的 </dl><dl> 由此而来）
            for (let prevPos = prev.length - 1; prevPos >= ipos; prevPos--) {
                const pi = prev.charAt(prevPos);
                if (pi === "*") {
                    ps("</ul>");
                } else if (pi === "#") {
                    ps("</ol>");
                } else if (m[1].charAt(prevPos) !== "") {
                    ps("</dl>");
                }
            }
            // 打开 m[1] 比 ipos 长出的层级（从浅到深）；<dl> 的判定同上（prev 侧）
            for (let matchPos = ipos; matchPos < m[1].length; matchPos++) {
                const li = m[1].charAt(matchPos);
                if (li === "*") {
                    ps("<ul>");
                } else if (li === "#") {
                    ps("<ol>");
                } else if (prev.charAt(matchPos) !== "") {
                    ps("<dl>");
                }
            }
            switch (m[1].charAt(m[1].length - 1)) {
                case "*":
                case "#":
                    // li 不闭合（同列表相邻项直接跟下一个 <li>，legacy 原样）
                    ps(`<li>${parse_inline_nowiki(m[2])}`);
                    break;
                case ";": {
                    ps("<dt>");
                    // 定义项切分：首个 ":" 起的余段 unshift 回队首，下一轮按
                    // ":" 行渲染 <dd>
                    const dtMatch = /(.*?)(:.*?)$/.exec(m[2]);
                    if (dtMatch) {
                        ps(parse_inline_nowiki(dtMatch[1]));
                        ll.unshift(dtMatch[2]);
                    } else {
                        ps(parse_inline_nowiki(m[2]));
                    }
                    break;
                }
                case ":":
                    ps(`<dd>${parse_inline_nowiki(m[2])}`);
            }
            prev = m[1];
        }
        for (let i = prev.length - 1; i >= 0; i--) {
            ps(f("</?>", prev.charAt(i) === "*" ? "ul" : prev.charAt(i) === "#" ? "ol" : "dl"));
        }
    };

    const parse_table = (): void => {
        // 表属性恒被丢弃：f 的模板 "<table>" 不含 "?" 占位符（legacy 原样怪癖）
        const attrMatch = /^\{\|( .*)$/.exec(ll[0]);
        endl(f("<table>", attrMatch ? attrMatch[1] : ""));
        while (ll.length) {
            if (ll[0].startsWith("|")) {
                switch (charAtPoint(1)) {
                    case "}":
                        endl("</table>");
                        return;
                    case "-":
                        // 行属性同样恒被丢弃（"<tr>" 无占位符）；分支入口保证行
                        // 以 "|" 开头，/\|-*(.*)/ 必命中
                        endl(f("<tr>", assume(/\|-*(.*)/.exec(ll[0]))[1]));
                        break;
                    default:
                        parse_table_data();
                }
            } else if (ll[0].startsWith("!")) {
                parse_table_data();
            } else {
                // 表头后、首个单元格前的杂行整行丢弃
                sh();
            }
        }
    };

    const parse_table_data = (): void => {
        // 调用点保证当前行以 | 或 ! 开头，alternation 必命中——legacy 的
        // td_match 判空分支不可达，已删
        const tdMatch = assume(/^(\|\+|\||!)((?:([^[|]*?)\|(?!\|))?(.*))$/.exec(sh()));
        if (tdMatch[1] === "|+") {
            ps("<caption");
        } else {
            ps(`<t${tdMatch[1] === "|" ? "d" : "h"}`);
        }
        // $3 命中说明「属性|」前缀被吃掉，正文落在 $4；否则正文为 $2 整段
        const matchI = typeof tdMatch[3] !== "undefined" ? 4 : 2;
        ps(">");
        if (tdMatch[1] !== "|+") {
            // "|"-格按 "||" 切、"!"-格按 "||"/"!!" 切（legacy 的字面量/正则双形态）；
            // split 后首段即本格内容，越界 shift/pop 均不可达（length 守卫），
            // legacy 的 `?? ""` 兜底已删
            const tdLine = tdMatch[matchI].split(tdMatch[1] === "|" ? "||" : /(?:\|\||!!)/);
            ps(parse_inline_nowiki(assume(tdLine.shift())));
            // 同行余格以独立行 unshift 回队列——但会被下方内容收集循环吃成
            // 段落（legacy 原样怪癖，测试锁定）
            while (tdLine.length) {
                ll.unshift(tdMatch[1] + assume(tdLine.pop()));
            }
        } else {
            ps(parse_inline_nowiki(tdMatch[matchI]));
        }
        // 收集本格后续行：嵌套 {| 计数，遇顶层的 | 或 ! 行停（该行留给外层
        // parse_table 处理）；循环结束后嵌套闭线与停战线都已沉入 td
        let tc = 0;
        const td: string[] = [];
        while (ll.length) {
            td.push(sh());
            if (ll.length && ll[0].startsWith("|")) {
                if (!tc) {
                    break;
                } else if (charAtPoint(1) === "}") {
                    tc--;
                }
            } else if (!tc && ll.length && ll[0].startsWith("!")) {
                break;
            } else if (ll.length && ll[0].startsWith("{|")) {
                tc++;
            }
        }
        if (td.length) {
            ps(convert(td));
        }
    };

    const parse_pre = (): void => {
        ps("<pre>");
        do {
            // pre 行内仍走 inline 解析（链接在 pre 里生效，legacy 原样）
            endl(`${parse_inline_nowiki(ll[0].substring(1))}\n`);
        } while (ll.length && ll[0].startsWith(" "));
        ps("</pre>");
    };

    const parse_block_image = (): void => {
        // 块级图片行整行吞掉（parse_image 恒返回空串）
        sh();
    };

    const parse_inline_nowiki = (str: string): string => {
        let lastend = 0;
        let substart = 0;
        // 嵌套 <nowiki> 开标记深度：内层开标记使首个闭标记只抵消深度而非结
        // 束区间（legacy 语义，测试锁定）
        let nestlev = 0;
        let html = "";
        let start = str.indexOf("<nowiki>", substart);
        while (start !== -1) {
            html += parse_inline_wiki(str.substring(lastend, start));
            start += 8;
            substart = start;
            let subloop = true;
            do {
                const open = str.indexOf("<nowiki>", substart);
                const close = str.indexOf("</nowiki>", substart);
                if (close <= open || open === -1) {
                    if (close === -1) {
                        // 未闭合：余段仅做实体转义，不再走 wiki 解析
                        return html + html_entities(str.slice(start));
                    }
                    substart = close + 9;
                    if (nestlev) {
                        nestlev--;
                    } else {
                        lastend = substart;
                        html += html_entities(str.substring(start, lastend - 9));
                        subloop = false;
                    }
                } else {
                    substart = open + 8;
                    nestlev++;
                }
            } while (subloop);
            start = str.indexOf("<nowiki>", substart);
        }
        return html + parse_inline_wiki(str.slice(lastend));
    };

    const parse_inline_images = (_str: string): string => {
        let str = _str;
        let substart = 0;
        let nestlev = 0;
        let start = str.indexOf("[[", substart);
        while (start !== -1) {
            if (RegExp(`^(Image|File|${instaConf.locale.image}):`, "i").test(str.slice(start + 2))) {
                let loop = true;
                substart = start;
                do {
                    substart += 2;
                    const close = str.indexOf("]]", substart);
                    const open = str.indexOf("[[", substart);
                    if (close <= open || open === -1) {
                        if (close === -1) {
                            // 未闭合的文件链接：整串原样返回（放弃后续处理）
                            return str;
                        }
                        substart = close;
                        if (nestlev) {
                            nestlev--;
                        } else {
                            const wiki = str.substring(start, close + 2);
                            // 文件链接整段移除（parse_image 恒空串）；replace
                            // 按字面量首现替换
                            str = str.replace(wiki, "");
                            // legacy 写法 substart = start + html.length，html
                            // 恒 ""，即回退到 start
                            substart = start;
                            loop = false;
                        }
                    } else {
                        substart = open;
                        nestlev++;
                    }
                } while (loop);
            } else {
                // 首个 [[ 不是文件链接就停止扫描——其后更远的文件链接不会被
                // 移除而是落进普通内链替换（legacy 原样怪癖，测试锁定）
                break;
            }
            start = str.indexOf("[[", substart);
        }
        return str;
    };

    const parse_inline_formatting = (str: string): string => {
        let italic = false;
        let bold = false;
        let li = 0;
        let o = "";
        let i = str.indexOf("''", li);
        while (i !== -1) {
            o += str.substring(li, i);
            li = i + 2;
            // 三个引号起算粗体（多跨一个字符），否则斜体；开合按各自状态翻
            // 转——五引号会产生 <b><i>x</b></i> 的交叉标签（legacy 原样）
            if (str.charAt(i + 2) === "'") {
                li++;
                bold = !bold;
                o += bold ? "<b>" : "</b>";
            } else {
                italic = !italic;
                o += italic ? "<i>" : "</i>";
            }
            i = str.indexOf("''", li);
        }
        return o + str.slice(li);
    };

    const parse_inline_wiki = (_str: string): string => {
        let str = parse_inline_images(_str);
        // <math>…</math> 整段移除（legacy 的 (?:) 空分组是 no-op，已简化）
        str = str.replace(/<math>(.*?)<\/math>/gi, "");
        const date = new Date();
        let minutes: number | string = date.getUTCMinutes();
        if (minutes < 10) {
            minutes = `0${minutes}`;
        }
        const dateStr = f("?:?, ? ? ? (UTC)", date.getUTCHours(), minutes, date.getUTCDate(), instaConf.locale.months[date.getUTCMonth()], date.getUTCFullYear());
        str = str
            // 签名波浪：5 波 = 时间戳、4 波 = 用户名 + 时间戳、3 波 = 用户名；
            // (?!~) 使 6 波从第 2 个字符起匹配，残一个 ~ 在时间戳前
            .replace(/~{5}(?!~)/g, dateStr)
            .replace(/~{4}(?!~)/g, `${instaConf.user.name} ${dateStr}`)
            .replace(/~{3}(?!~)/g, instaConf.user.name)
            // 冒号引导的分类/文件/interwiki 链接渲染为普通链接（无管道形态；
            // i 标志让 File/file 等大小写变体同样命中）。interwiki 未配置时经
            // String() 串化为 "undefined"——构造出的正则永不匹配（legacy 原样）
            .replace(RegExp(`\\[\\[:((?:${instaConf.locale.category}|Image|File|${instaConf.locale.image}|${String(instaConf.wiki.interwiki)}):[^|]*?)\\]\\](\\w*)`, "gi"), (_$0, $1: string, $2: string) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($1) + htmlescape_text($2)))
            // 无冒号引导的分类与 interwiki 链接整段删除（含管道形态）
            .replace(RegExp(`\\[\\[(?:${instaConf.locale.category}|${String(instaConf.wiki.interwiki)}):.*?\\]\\]`, "gi"), "")
            // 冒号引导 + 管道标签形态
            .replace(RegExp(`\\[\\[:((?:${instaConf.locale.category}|Image|File|${instaConf.locale.image}|${String(instaConf.wiki.interwiki)}):.*?)\\|([^\\]]+?)\\]\\](\\w*)`, "gi"), (_$0, $1: string, $2: string, $3: string) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($2) + htmlescape_text($3)))
            // 子页面链接：href 拼 baseUrl；未传时 String(undefined) 串化为
            // "undefined/..."（legacy 原样怪癖，测试锁定）
            .replace(/\[\[(\/[^|]*?)\]\]/g, (_$0, $1: string) => f("<a href='?'>?</a>", String(instaConf.baseUrl) + htmlescape_attr($1), htmlescape_text($1)))
            .replace(/\[\[(\/.*?)\|(.+?)\]\]/g, (_$0, $1: string, $2: string) => f("<a href='?'>?</a>", String(instaConf.baseUrl) + htmlescape_attr($1), htmlescape_text($2)))
            // 普通内链（[^[|] 排除管道，尾词 \w* 吸附进链文本）
            .replace(/\[\[([^[|]*?)\]\](\w*)/g, (_$0, $1: string, $2: string) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($1) + htmlescape_text($2)))
            // 管道内链
            .replace(/\[\[([^[]*?)\|([^\]]+?)\]\](\w*)/g, (_$0, $1: string, $2: string, $3: string) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($2) + htmlescape_text($3)))
            // 管道戏法 [[目标|]]：href 含命名空间与括号后缀，文本只取主干
            .replace(/\[\[([^\]]*?:)?(.*?)( *\(.*?\))?\|\]\]/g, (_$0, $1: string | undefined, $2: string, $3: string | undefined) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1 ?? "") + htmlescape_attr($2) + htmlescape_attr($3 ?? ""), htmlescape_text($2)))
            // 带标签外链（协议://地址 标签）
            .replace(/\[(https?|news|ftp|mailto|gopher|irc):(\/*)([^\]]*?) (.*?)\]/g, (_$0, $1: string, $2: string, $3: string, $4: string) => f("<a class='external' href='?:?'>?</a>", htmlescape_attr($1), htmlescape_attr($2) + htmlescape_attr($3), htmlescape_text($4)))
            // 无标签 http 外链渲染为 [#]
            .replace(/\[http:\/\/(.*?)\]/g, (_$0, $1: string) => f("<a class='external' href='http://?'>[#]</a>", htmlescape_attr($1)))
            // 无标签其余协议外链（协议://地址 为文本）
            .replace(/\[(news|ftp|mailto|gopher|irc):(\/*)(.*?)\]/g, (_$0, $1: string, $2: string, $3: string) => f("<a class='external' href='?:?'>?:?</a>", htmlescape_attr($1), htmlescape_attr($2) + htmlescape_attr($3), htmlescape_text($1), htmlescape_text($2) + htmlescape_text($3)))
            // 裸外链（行首 ^ 或空格后；尾字符排除 .,!?;: 空格与 $——右括号
            // 会被吞进链接，legacy 原样）
            .replace(/(^| )(https?|news|ftp|mailto|gopher|irc):(\/*)([^ $]*[^.,!?;: $])/g, (_$0, $1: string, $2: string, $3: string, $4: string) => f("?<a class='external' href='?:?'>?:?</a>", htmlescape_text($1), htmlescape_attr($2), htmlescape_attr($3) + htmlescape_attr($4), htmlescape_text($2), htmlescape_text($3) + htmlescape_text($4)))
            // 魔术字：非全局替换，每词只清第一处（legacy 原样）
            .replace("__NOTOC__", "")
            .replace("__NOINDEX__", "")
            .replace("__INDEX__", "")
            .replace("__NOEDITSECTION__", "");
        return parse_inline_formatting(str);
    };

    while (ll.length) {
        const line = ll[0];
        // 标题：1-6 个 = 定级（更多等号贪婪回退降级），首组后的 (.*) 经 inline
        // 解析、尾组（闭合等号后的余文）原样输出不解析
        const heading = /^(={1,6})(.*)\1(.*)$/.exec(line);
        if (heading) {
            p = 0;
            endl(f("<h?>?</h?>?", heading[1].length, parse_inline_nowiki(heading[2]), heading[1].length, heading[3]));
        } else if (/^[*#:;]/.test(line)) {
            p = 0;
            parse_list();
        } else if (line.startsWith(" ")) {
            p = 0;
            parse_pre();
        } else if (line.startsWith("{|")) {
            p = 0;
            parse_table();
        } else if (/^----+$/.test(line)) {
            p = 0;
            endl("<hr />");
        } else if (BLOCK_IMAGE.test(line)) {
            p = 0;
            parse_block_image();
        } else {
            if (line === "") {
                // 空行结束当前段（段落从不输出 </p>，legacy 原样）；后一行也是
                // 空行且后面还有内容时，本空行输出 <p><br>
                p = ll.length > 1 && ll[1] === "";
                if (p) {
                    endl("<p><br>");
                }
            } else {
                if (!p) {
                    ps("<p>");
                    p = 1;
                }
                ps(`${parse_inline_nowiki(line)} `);
            }
            sh();
        }
    }
    return o;
};
