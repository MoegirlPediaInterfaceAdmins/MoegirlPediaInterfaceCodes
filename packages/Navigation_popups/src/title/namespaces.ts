// 命名空间域：ns id 常量、interwiki/重定向正则的运行时状态与装配入口。
// 行为基准 = legacy src/modules/namespaces.ts（commit 02c8dec）。
//
// legacy 把本域状态挂在 pg 动态域（pg.nsXxxId / pg.wiki.interwiki /
// pg.re.interwiki / pg.re.redirect）；重写版收敛为本模块导出的 nsState
// 单例，由 boot 装配层（见 rewrite-plan §4.1）在 setupPopups 时序中调用
// 下方 setter 填充。
//
// lang 来源：legacy 在 setSiteInfo 中以 mw.config.get("wgContentLanguage")
// 捕获 pg.wiki.lang 后供 setInterwiki/setRedirs 读取；wgContentLanguage
// 在页面生命周期内恒定，重写版直接在 setter 内读取配置，避免重复维护
// 一份 lang 状态（TODO(rewrite): siteinfo 域落地后如需 wiki.lang 快照，
// 由该域统一持有 → core 域 siteinfo 模块实现时）。

export interface NamespaceState {
    // 七个 id 是硬编码常量（legacy pg.nsXxxId），初值即终值——setNamespaces
    // 重算覆盖同值；不以 null 表示「装配前」（消类型层 ?? 兜底的死分支）
    specialId: number;
    mainspaceId: number;
    imageId: number;
    userId: number;
    usertalkId: number;
    categoryId: number;
    templateId: number;
    /** 萌百定制 interwiki 前缀表（"en|ja" 等）；表外语言保持 undefined */
    interwiki: string | undefined;
    re: {
        interwiki: RegExp | null;
        redirect: RegExp | null;
    };
}

export const nsState: NamespaceState = {
    specialId: -1,
    mainspaceId: 0,
    imageId: 6,
    userId: 2,
    usertalkId: 3,
    categoryId: 14,
    templateId: 10,
    interwiki: undefined,
    re: {
        interwiki: null,
        redirect: null,
    },
};

export const upcaseFirst = (str: string): string => str.charAt(0).toUpperCase() + str.substring(1);

export const setNamespaces = (): void => {
    nsState.specialId = -1;
    nsState.mainspaceId = 0;
    nsState.imageId = 6;
    nsState.userId = 2;
    nsState.usertalkId = 3;
    nsState.categoryId = 14;
    nsState.templateId = 10;
};

export const setRedirs = (): void => {
    const r = "redirect";
    const R = "REDIRECT";
    // 各语言 wiki 的「#重定向」等价关键字表（legacy 逐项照搬）。萌百为 zh
    // 分支（#REDIRECT | #重定向）；表按 wgContentLanguage 选取，i 标志让
    // "#redirect" 等大小写变体同样命中。
    const redirLists: Partial<Record<string, (string | RegExp)[]>> = {
        ar: [R, "تحويل"],
        be: [r, "перанакіраваньне"],
        bg: [r, "пренасочване", "виж"],
        bs: [r, "Preusmjeri", "preusmjeri", "PREUSMJERI"],
        bn: [R, "পুনর্নির্দেশ"],
        cs: [R, "PŘESMĚRUJ"],
        cy: [r, "ail-cyfeirio"],
        de: [R, "WEITERLEITUNG"],
        el: [R, "ΑΝΑΚΑΤΕΥΘΥΝΣΗ"],
        eo: [R, "ALIDIREKTU", "ALIDIREKTI"],
        es: [R, "REDIRECCIÓN"],
        et: [r, "suuna"],
        ga: [r, "athsheoladh"],
        gl: [r, "REDIRECCIÓN", "REDIRECIONAMENTO"],
        he: [R, "הפניה"],
        hu: [R, "ÁTIRÁNYÍTÁS"],
        is: [r, "tilvísun", "TILVÍSUN"],
        it: [R, "RINVIA", "Rinvia"],
        ja: [R, "転送"],
        mk: [r, "пренасочување", "види"],
        nds: [r, "wiederleiden"],
        "nds-nl": [R, "DEURVERWIEZING", "DUURVERWIEZING"],
        nl: [R, "DOORVERWIJZING"],
        nn: [r, "omdiriger"],
        pl: [R, "PATRZ", "PRZEKIERUJ", "TAM"],
        pt: [R, "redir"],
        ru: [R, "ПЕРЕНАПРАВЛЕНИЕ", "ПЕРЕНАПР"],
        sk: [r, "presmeruj"],
        sr: [r, "Преусмери", "преусмери", "ПРЕУСМЕРИ", "Preusmeri", "preusmeri", "PREUSMERI"],
        tt: [R, "yünältü", "перенаправление", "перенапр"],
        uk: [R, "ПЕРЕНАПРАВЛЕННЯ", "ПЕРЕНАПР"],
        vi: [r, "đổi"],
        yi: [R, "ווייטערפירן"],
        zh: [R, "重定向"],
    };
    const redirList: (string | RegExp)[] = redirLists[mw.config.get("wgContentLanguage")] ?? [r, R];
    // 重定向 wikitext 匹配：`#关键字 目标[[链接]]` —— 捕获组依次为关键字、
    // 目标页、管道余段、尾部文本（links.ts 的重定向跟随依赖组 2 取目标）。
    // 表外语言 interwiki/关键字保持缺省（undefined 时模板串化为 "undefined"，
    // legacy 原样保留——萌百只走 zh 分支，该路径不会触达）。
    nsState.re.redirect = RegExp(`^\\s*[#](${redirList.join("|")}).*?\\[{2}([^\\|\\]]*)(|[^\\]]*)?\\]{2}\\s*(.*)`, "i");
};

export const setInterwiki = (): void => {
    // 萌百定制：仅对 zh/en/ja 三语言维护跨语预览前缀表，其余语言不设置
    // （legacy 原样；构造出的 ^undefined: 正则永不匹配真实链接）。
    const lang = mw.config.get("wgContentLanguage");
    if (lang === "zh") {
        nsState.interwiki = "en|ja";
    } else if (lang === "en") {
        nsState.interwiki = "zh|ja";
    } else if (lang === "ja") {
        nsState.interwiki = "zh|en";
    }
    // 注意 | 不分组：/^en|ja:/ 实际是「以 en 开头」或「含 ja:」——legacy
    // 行为原样保留，勿"修正"为 ^(en|ja):，否则链接分类会漂移。
    nsState.re.interwiki = RegExp(`^${String(nsState.interwiki)}:`);
};

export const nsRe = (namespaceId?: number): string => {
    // 动态收集 wgNamespaceIds 里属于该 id 的全部本地化/规范别名（键为小写、
    // 空格转下划线），每个别名产出两个变体：空格放宽为 [ _] 的明文形式与
    // encodeURI 形式（匹配 URL 中的百分号编码标题）。变量名沿用 legacy
    // （imageNamespaceVariants）——nsRe 自始就服务全部 ns，不止 File。
    const imageNamespaceVariants: string[] = [];
    for (const [localizedNamespaceLc, id] of Object.entries(mw.config.get("wgNamespaceIds"))) {
        if (id !== namespaceId) {
            continue;
        }
        const variant = upcaseFirst(localizedNamespaceLc);
        imageNamespaceVariants.push(mw.util.escapeRegExp(variant).split(" ").join("[ _]"));
        imageNamespaceVariants.push(mw.util.escapeRegExp(encodeURI(variant)));
    }
    return `(?:${imageNamespaceVariants.join("|")})`;
};

export const nsReImage = (): string => nsRe(nsState.imageId);
