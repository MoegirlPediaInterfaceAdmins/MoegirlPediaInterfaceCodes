// 标题解析域：Title/Stringwrapper、URL 与 wikitext 的标题互转、链接过滤。
// 行为基准 = legacy src/modules/titles.ts（commit 02c8dec）。
//
// legacy 依赖的站点派生状态挂在 pg.wiki/pg.re/pg.flag/pg.misc（由 init.ts 的
// setSiteInfo/setTitleBase/setMainRegex/setRegexps/setMisc 在 setupPopups 时序
// 中装配）。重写版的 siteinfo/boot 域尚未落地，这些值暂由本模块导出的可注入
// wiki 状态对象承载：初值为空，装配层（boot）填充；未装配时的行为与 legacy
// 未初始化路径一致——正则字段为 null，在其上调用 .test/.exec 直接抛 TypeError。
// TODO(rewrite): 正则/基址的构造公式（legacy init.ts setTitleBase/setMainRegex/
// setRegexps/setMisc）迁入 boot/api 域时改为注入真实值 → boot 域模块实现时，
// 测试侧 fixtures（tests/unit/title/title.test.ts）同步对齐。
import { nsState } from "./namespaces.ts";

export interface TitleWikiState {
    /** toUrl 前缀（legacy pg.wiki.titlebase：protocol//sitebase + wgScript + "?title="） */
    titlebase: string;
    flag: {
        /** fromURL 的 Safari %25 双重解码路径开关（legacy pg.flag.isSafari） */
        isSafari: boolean;
    };
    misc: {
        /** myDecodeURI 的后置映射表（legacy setMisc 的 decodeExtras） */
        decodeExtras: { from: string; to: string }[] | null;
        /**
         * 导航链接缺省 class（legacy pg.misc.defaultNavlinkClassname）：legacy
         * 全仓只有 links.ts 一处读取、从未赋值，运行时恒 undefined——照搬，
         * 只声明不赋值、不给默认（titledWikiLink 的 className 缺省源头）
         */
        defaultNavlinkClassname?: string;
    };
    re: {
        /** 站内链接白名单前缀（titlebase|articlebase，setTitleBase 派生） */
        basenames: RegExp | null;
        /** Special 页/section 排除规则（setRegexps 派生） */
        urlNoPopup: RegExp | null;
        /** 本站条目 URL 主匹配（setMainRegex 派生） */
        main: RegExp | null;
        contribs: RegExp | null;
        email: RegExp | null;
        backlinks: RegExp | null;
        specialdiff: RegExp | null;
        /** IP 用户名匹配常量（legacy init.ts setRegexps） */
        ipUser: RegExp | null;
        /** 消歧义/小作品检测正则（选项 popupDabRegexp/popupStubRegexp 派生） */
        disambig: RegExp | null;
        stub: RegExp | null;
        /** wikitext 图片提取（setRegexps 派生，preview 域使用；括号组数随正则） */
        image: RegExp | null;
        imageBracketCount?: number;
        /** wikitext 分类提取（preview 域统计使用） */
        category: RegExp | null;
        categoryBracketCount?: number;
        /** URL 修订版本/差异参数（links/diffpreview 域使用） */
        oldid: RegExp | null;
        diff: RegExp | null;
    };
    /**
     * 选项读取缝：本域只读 popupOnlyArticleLinks / popupAllDabsStubs 两项，
     * core/options 域落地前以 legacy 默认值兜底（window.popupXxx 覆盖链由
     * 装配层接入时用真实 getValueOf 整体替换本字段）。
     */
    getOption: (name: string) => unknown;
}

const titleOptionDefaults: Record<string, boolean> = {
    popupOnlyArticleLinks: true,
    popupAllDabsStubs: false,
};

export const wiki: TitleWikiState = {
    titlebase: "",
    flag: {
        isSafari: false,
    },
    misc: {
        decodeExtras: null,
    },
    re: {
        basenames: null,
        urlNoPopup: null,
        main: null,
        contribs: null,
        email: null,
        backlinks: null,
        specialdiff: null,
        ipUser: null,
        disambig: null,
        stub: null,
        image: null,
        category: null,
        oldid: null,
        diff: null,
    },
    getOption: (name: string): unknown => titleOptionDefaults[name],
};

// 与 legacy tools.ts 的 assume 同义的恒等断言：调用方担保装配层已填充（运行
// 时不变量，类型层承载不了）；未装配时与 legacy 未初始化一样在原处崩溃，
// 不做兜底（不过度防御）。
const assume = <T>(value: T | null | undefined): T => value as unknown as T;

// legacy 的 String.prototype.parenSplit polyfill 只在「原生 split 不保留捕获
// 组」的前 ES5 引擎生效；现代引擎（站点与 jsdom 均是）走原生 split 分支。
// 重写版以原生 split 直接实现：RegExp 入参保留捕获组，字符串入参按字面量
// 切分（urlAnchor 依赖这一字面量怪癖，见其注释）。
export const parenSplit = (str: string, re: RegExp | string): string[] => str.split(re);

export class Stringwrapper {
    value: string | null = null;
    indexOf(x: string): number {
        return this.toString().indexOf(x);
    }
    toString(): string {
        // null-valued wrappers are a transient upstream state; the null
        // flows through untouched at runtime
        return this.value as unknown as string;
    }
    parenSplit(x: RegExp | string): string[] {
        return parenSplit(this.toString(), x);
    }
    substring(x: number, y?: number): string {
        if (typeof y === "undefined") {
            return this.toString().substring(x);
        }
        return this.toString().substring(x, y);
    }
    split(x: string): string[] {
        return this.toString().split(x);
    }
    replace(x: RegExp, y: string): string {
        return this.toString().replace(x, y);
    }
}

export class Title extends Stringwrapper {
    anchor = "";
    // legacy marker assigned (and never read) by setUtf
    ns?: null;
    // revision anchor state attached by actions.ts loadPreview
    oldid?: string | null;
    constructor(val?: string | Stringwrapper | null) {
        super();
        this.setUtf(val);
    }
    static fromURL = (h: string): Title => new Title().fromURL(h);
    static fromAnchor = (a: HTMLAnchorElement | null): Title => new Title().fromAnchor(a);
    static fromWikiText = (txt: string): Title => new Title().fromWikiText(txt);
    override toString(omitAnchor?: unknown): string {
        return String(this.value) + (!omitAnchor && this.anchor ? `#${this.anchorString()}` : "");
    }
    anchorString(): string {
        if (!this.anchor) {
            return "";
        }
        const split = parenSplit(this.anchor, /((?:[.][0-9A-F]{2})+)/);
        const len = split.length;
        let value: string;
        for (let j = 1; j < len; j += 2) {
            value = split[j].split(".").join("%");
            try {
                value = decodeURIComponent(value);
            } catch {
                // 畸形百分号序列（如不完整 UTF-8）保留替换后的原样继续拼装
            }
            split[j] = value.split("_").join(" ");
        }
        return split.join("");
    }
    urlAnchor(): string {
        // legacy 把模式串 "/((?:[%][0-9A-F]{2})+)/" 以字符串（非 RegExp）传入
        // parenSplit——原生 split 按字面量切分，锚点几乎永远不含该字面量，故
        // 此方法实际恒等返回原锚点。保留 legacy 原样（含字面量命中时只处理
        // 分隔符之后余段的怪癖），勿改成按 RegExp 解读，否则 URL 拼装漂移。
        const split = parenSplit(this.anchor, "/((?:[%][0-9A-F]{2})+)/");
        const len = split.length;
        for (let j = 1; j < len; j += 2) {
            split[j] = split[j].split("%").join(".");
        }
        return split.join("");
    }
    anchorFromUtf(str: string): void {
        this.anchor = encodeURIComponent(str.split(" ").join("_")).split("%3A").join(":").split("'").join("%27").split("%").join(".");
    }
    decodeNasties(txt: string | Stringwrapper): string | Stringwrapper {
        try {
            let ret = decodeURI(this.decodeEscapes(txt));
            ret = ret.replace(/[_ ]*$/, "");
            return ret;
        } catch {
            return txt;
        }
    }
    decodeEscapes = (txt: string | Stringwrapper): string => {
        const split = parenSplit(txt.toString(), /((?:[%][0-9A-Fa-f]{2})+)/);
        const len = split.length;
        if (len === 1) {
            return split[0].replace(/%(?![0-9a-fA-F][0-9a-fA-F])/g, "%25");
        }
        for (let i = 1; i < len; i = i + 2) {
            split[i] = decodeURIComponent(split[i]);
        }
        return split.join("");
    };
    hintValue(): string {
        if (!this.value) {
            return "";
        }
        return safeDecodeURI(this.value) as string;
    }
    toUserName(withNs?: boolean): void {
        if (this.namespaceId() !== nsState.userId && this.namespaceId() !== nsState.usertalkId) {
            this.value = null;
            return;
        }
        this.value = (withNs ? `${mw.config.get("wgFormattedNamespaces")[nsState.userId]}:` : "") + this.stripNamespace().split("/")[0];
    }
    userName(withNs?: boolean): Title | null {
        const t = new Title(this.value);
        t.toUserName(withNs);
        if (t.value) {
            return t;
        }
        return null;
    }
    toTalkPage(): string | null {
        if (this.value === null) {
            return null;
        }
        const namespaceId = this.namespaceId();
        if (namespaceId >= 0 && namespaceId % 2 === 0) {
            // 局部标注 string | undefined：索引可能落在表外（如 wgFormattedNamespaces
            // 未提供 id+1 的讨论主题名），typeof 判空才不是恒真
            const localizedNamespace: string | undefined = mw.config.get("wgFormattedNamespaces")[namespaceId + 1];
            if (typeof localizedNamespace !== "undefined") {
                if (localizedNamespace === "") {
                    this.value = this.stripNamespace();
                } else {
                    this.value = `${localizedNamespace.split(" ").join("_")}:${this.stripNamespace()}`;
                }
                return this.value;
            }
        }
        this.value = null;
        return null;
    }
    namespace(): string {
        return mw.config.get("wgFormattedNamespaces")[this.namespaceId()];
    }
    namespaceId(): number {
        // 萌百定制：整段包 try/catch——value 为 null（fromURL 未命中）时 assume
        // 崩溃被拦截，按主名字空间返回并记 console.error，而非中断弹窗流程
        try {
            const n = assume(this.value).indexOf(":");
            if (n < 0) {
                return 0;
            }
            const namespaceId: number | undefined = mw.config.get("wgNamespaceIds")[assume(this.value).substring(0, n).split(" ").join("_").toLowerCase()];
            if (typeof namespaceId === "undefined") {
                return 0;
            }
            return namespaceId;
        } catch (e) {
            console.error(e, this);
            return 0;
        }
    }
    talkPage(): Title | null {
        const t = new Title(this.value);
        t.toTalkPage();
        if (t.value) {
            return t;
        }
        return null;
    }
    isTalkPage(): boolean {
        if (this.talkPage() === null) {
            return true;
        }
        return false;
    }
    toArticleFromTalkPage(): string | null {
        if (this.value === null) {
            return null;
        }
        const namespaceId = this.namespaceId();
        if (namespaceId >= 0 && namespaceId % 2 === 1) {
            const localizedNamespace: string | undefined = mw.config.get("wgFormattedNamespaces")[namespaceId - 1];
            if (typeof localizedNamespace !== "undefined") {
                if (localizedNamespace === "") {
                    this.value = this.stripNamespace();
                } else {
                    this.value = `${localizedNamespace.split(" ").join("_")}:${this.stripNamespace()}`;
                }
                return this.value;
            }
        }
        this.value = null;
        return null;
    }
    articleFromTalkPage(): Title | null {
        const t = new Title(this.value);
        t.toArticleFromTalkPage();
        if (t.value) {
            return t;
        }
        return null;
    }
    articleFromTalkOrArticle(): Title {
        const t = new Title(this.value);
        if (t.toArticleFromTalkPage()) {
            return t;
        }
        return this;
    }
    isIpUser(): boolean {
        return assume(wiki.re.ipUser).test(String(this.userName()));
    }
    stripNamespace(): string {
        const n = assume(this.value).indexOf(":");
        if (n < 0) {
            return assume(this.value);
        }
        const namespaceId = this.namespaceId();
        if (namespaceId === nsState.mainspaceId) {
            return assume(this.value);
        }
        return assume(this.value).substring(n + 1);
    }
    setUtf(value: string | Stringwrapper | null | undefined): void {
        if (!value) {
            this.value = "";
            return;
        }
        const anch = value.indexOf("#");
        if (anch < 0) {
            this.value = value.split("_").join(" ");
            this.anchor = "";
            return;
        }
        this.value = value.substring(0, anch).split("_").join(" ");
        this.anchor = value.substring(anch + 1);
        this.ns = null;
    }
    setUrl(urlfrag: string): void {
        // 锚点行沿用 legacy 公式：拿「解码后的 value」按原始 anch 偏移切片
        // （decodeURI 只缩短不改长，锚点实际恒为空串）——原样保留
        const anch = urlfrag.indexOf("#");
        this.value = safeDecodeURI(urlfrag.substring(0, anch)) as string;
        this.anchor = this.value.substring(anch + 1);
    }
    append(x: string): void {
        this.setUtf(String(this.value) + x);
    }
    urlString(_x?: unknown): string {
        const x = (_x ?? {}) as { omitAnchor?: boolean; keepSpaces?: boolean };
        let v = this.toString(true);
        if (!x.omitAnchor && this.anchor) {
            v += `#${this.urlAnchor()}`;
        }
        if (!x.keepSpaces) {
            v = v.split(" ").join("_");
        }
        return encodeURI(v).split("&").join("%26").split("?").join("%3F").split("+").join("%2B");
    }
    removeAnchor(): Title {
        return new Title(this.toString(true));
    }
    toUrl(): string {
        return wiki.titlebase + this.urlString();
    }
    fromURL(_h?: unknown): this {
        if (typeof _h !== "string") {
            this.value = null;
            return this;
        }
        let h: string = _h;
        const splitted = h.split("?");
        splitted[0] = splitted[0].split("&").join("%26");
        h = splitted.join("?");
        const contribs = assume(wiki.re.contribs).exec(h);
        if (contribs) {
            if (contribs[1] === "title=") {
                contribs[3] = contribs[3].split("+").join(" ");
            }
            const u = new Title(contribs[3]);
            this.setUtf(this.decodeNasties(`${mw.config.get("wgFormattedNamespaces")[nsState.userId]}:${u.stripNamespace()}`));
            return this;
        }
        const email = assume(wiki.re.email).exec(h);
        if (email) {
            this.setUtf(this.decodeNasties(`${mw.config.get("wgFormattedNamespaces")[nsState.userId]}:${new Title(email[3]).stripNamespace()}`));
            return this;
        }
        const backlinks = assume(wiki.re.backlinks).exec(h);
        if (backlinks) {
            this.setUtf(this.decodeNasties(new Title(backlinks[3])));
            return this;
        }
        const specialdiff = assume(wiki.re.specialdiff).exec(h);
        if (specialdiff) {
            this.setUtf(this.decodeNasties(new Title(`${mw.config.get("wgFormattedNamespaces")[nsState.specialId]}:Diff`)));
            return this;
        }
        const m = assume(wiki.re.main).exec(h);
        if (m === null) {
            this.value = null;
        } else {
            const fromBotInterface = /[?](.+[&])?title=/.test(h);
            if (fromBotInterface) {
                m[2] = m[2].split("+").join("_");
            }
            const extracted = m[2] + (m[3] ? `#${m[3]}` : "");
            if (wiki.flag.isSafari && /%25[0-9A-Fa-f]{2}/.test(extracted)) {
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- unescape is required for the Safari %25 path
                this.setUtf(decodeURIComponent(unescape(extracted)));
            } else {
                this.setUtf(this.decodeNasties(extracted));
            }
        }
        return this;
    }
    fromAnchor(a: HTMLAnchorElement | null): this {
        if (!a) {
            this.value = null;
            return this;
        }
        return this.fromURL(a.href);
    }
    fromWikiText(_txt: string | Stringwrapper): this {
        let txt = _txt;
        txt = myDecodeURI(txt);
        this.setUtf(txt);
        return this;
    }
}

export const parseParams = (_url: string): Record<string, string | null | undefined> => {
    let url = _url;
    const specialDiff = assume(wiki.re.specialdiff).exec(url);
    if (specialDiff) {
        const split = specialDiff[1].split("/");
        if (split.length === 1) {
            return {
                oldid: split[0],
                diff: "prev",
            };
        } else if (split.length === 2) {
            return {
                oldid: split[0],
                diff: split[1],
            };
        }
    }
    const ret: Record<string, string | null | undefined> = {};
    if (!url.includes("?")) {
        return ret;
    }
    url = url.split("#")[0];
    const s = url.split("?").slice(1).join();
    const t = s.split("&");
    for (const pair of t) {
        const z: (string | null)[] = pair.split("=");
        z.push(null);
        ret[assume(z[0])] = z[1];
    }
    if (ret.diff && typeof ret.oldid === "undefined") {
        ret.oldid = "prev";
    }
    if (ret.oldid && (ret.oldid === "prev" || ret.oldid === "next" || ret.oldid === "cur")) {
        const helper = ret.diff;
        ret.diff = ret.oldid;
        ret.oldid = helper;
    }
    return ret;
};

const myDecodeURI = (str: string | Stringwrapper): string | Stringwrapper => {
    let ret: string;
    try {
        ret = decodeURI(str.toString());
    } catch {
        return str;
    }
    const extras = wiki.misc.decodeExtras;
    for (let i = 0; i < (extras?.length ?? 0); ++i) {
        const from = assume(extras)[i].from;
        const to = assume(extras)[i].to;
        ret = ret.split(from).join(to);
    }
    return ret;
};

export const safeDecodeURI = (str: string | Stringwrapper): string | Stringwrapper => {
    const ret = myDecodeURI(str);
    return ret || str;
};

export const isDisambig = (data: string, article: Title): boolean => {
    if (!wiki.getOption("popupAllDabsStubs") && article.namespace()) {
        return false;
    }
    return !article.isTalkPage() && assume(wiki.re.disambig).test(data);
};

export const stubCount = (data: string, article: Title): false | { real: number; sect: number } => {
    if (!wiki.getOption("popupAllDabsStubs") && article.namespace()) {
        return false;
    }
    let sectStub = 0;
    let realStub = 0;
    if (assume(wiki.re.stub).test(data)) {
        const s = parenSplit(data, assume(wiki.re.stub));
        for (let i = 1; i < s.length; i = i + 2) {
            if (s[i]) {
                ++sectStub;
            } else {
                ++realStub;
            }
        }
    }
    return {
        real: realStub,
        sect: sectStub,
    };
};

export const isValidImageName = (str: string | Stringwrapper): boolean => str.indexOf("{") === -1;

export const isInStrippableNamespace = (article: Title): boolean => article.namespaceId() !== 0;

export const isInMainNamespace = (article: Title): boolean => article.namespaceId() === 0;

export const anchorContainsImage = (a: HTMLAnchorElement | null): boolean => {
    if (a === null) {
        return false;
    }
    const kids = a.childNodes;
    for (const kid of kids) {
        if (kid.nodeName === "IMG") {
            return true;
        }
    }
    return false;
};

declare global {
    interface HTMLAnchorElement {
        // .nopopups 容器与 vector 菜单标题链的排除标记（legacy types/anchors.ts）
        inNopopupSpan?: boolean;
    }
}

export const isPopupLink = (a: HTMLAnchorElement): boolean => {
    if (!markNopopupSpanLinks.done) {
        markNopopupSpanLinks();
    }
    if (a.inNopopupSpan) {
        return false;
    }
    if (a.onmousedown || a.getAttribute("nopopup")) {
        return false;
    }
    const h = a.href;
    if (h === `${document.location.href}#`) {
        return false;
    }
    if (!assume(wiki.re.basenames).test(h)) {
        return false;
    }
    if (!assume(wiki.re.urlNoPopup).test(h)) {
        return true;
    }
    return (assume(wiki.re.email).test(h) || assume(wiki.re.contribs).test(h) || assume(wiki.re.backlinks).test(h) || assume(wiki.re.specialdiff).test(h)) && !h.includes("&limit=");
};

// 首次 isPopupLink 调用时扫描一次 .nopopups 容器并置 done；legacy 无重置
// 入口（动态内容重扫属 events 域职责，届时由装配层处理）
const markNopopupSpanLinks: (() => void) & { done?: boolean } = () => {
    if (!wiki.getOption("popupOnlyArticleLinks")) {
        fixVectorMenuPopups();
    }
    const s = $(".nopopups").toArray();
    for (const container of s) {
        const as = container.getElementsByTagName("a");
        for (const a of as) {
            a.inNopopupSpan = true;
        }
    }
    markNopopupSpanLinks.done = true;
};

const fixVectorMenuPopups = (): void => {
    $("div.vectorMenu h3:first a:first, div.vector-menu h3:first a:first, nav.vector-menu h3:first a:first").prop("inNopopupSpan", true);
};
