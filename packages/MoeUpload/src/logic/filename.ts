// 文件名处理：非法字符清洗、去重后缀、File: 前缀剥离
// %XX / &…; / ~~~ 在 $wgLegalTitleChars 内、服务端不替换，须本地先清洗，否则传完字节才报 illegal-filename
const ILLEGAL_CHARS = /[#<>[\]{}|:;/\\?\s]+/g;
const PERCENT_ENCODING = /%[0-9A-Fa-f]{2}/g;
const HTML_ENTITY = /&[A-Za-z0-9\u0080-\uFFFF]+;/g;
const MAGIC_TILDE = /~~~/g;
const MAX_NAME_BYTES = 240;

// File 命名空间前缀：ASCII 与中文别名；其他 "xxx:" 由服务端保留并转连字符
const FILE_PREFIX = /^(?:file|文件|檔案|档案)\s*[:：]\s*/i;

const stripFilePrefix = (name: string): string => name.replace(FILE_PREFIX, "").trim();

// 服务端会对 File 标题做 ucfirst（$wgCapitalLinks）；本地先做，显示名/批内去重/服务端判定才一致
const ucfirst = (text: string): string =>
    text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

// 顺序不可换：%XX / &…; / ~~~ 必须先于通用字符集（否则 &nbsp; 的分号被吃掉）
// 结果必须幂等（TitleInput blur 回写与 store 比对依赖）
const sanitizeFilename = (name: string): string => {
    let cleaned = stripFilePrefix(name)
        .replace(PERCENT_ENCODING, " ")
        .replace(HTML_ENTITY, " ")
        .replace(MAGIC_TILDE, " ")
        .replace(ILLEGAL_CHARS, " ")
        .replace(/_{2,}/g, "_")
        .replace(/\s+/g, " ")
        .trim();
    // 去掉开头的点号，避免产生隐藏文件式标题
    cleaned = cleaned.replace(/^[.\s]+/, "");
    if (!cleaned) {
        return "";
    }
    // ucfirst 在截断之前：个别字符大写后会变宽（ß→SS），先截断会超预算
    return truncateBytes(ucfirst(cleaned), MAX_NAME_BYTES);
};

const dedupeFilename = (name: string, isTaken: (candidate: string) => boolean): string => {
    if (!isTaken(name)) {
        return name;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    for (let i = 2; ; i++) {
        const candidate = `${stem} (${i})${ext}`;
        if (!isTaken(candidate)) {
            return candidate;
        }
    }
};

// 按 UTF-8 字节截断并保留扩展名（MW 按扩展名判类型，截掉 .png 会被服务端拒绝）
const truncateBytes = (text: string, maxBytes: number): string => {
    if (new TextEncoder().encode(text).length <= maxBytes) {
        return text;
    }
    const dot = text.lastIndexOf(".");
    // 点位于首位时不算扩展名
    const extension = dot > 0 ? text.slice(dot) : "";
    const budget = maxBytes - new TextEncoder().encode(extension).length;
    if (!extension || budget <= 0) {
        return cutBytes(text, maxBytes);
    }
    return `${cutBytes(text.slice(0, dot), budget)}${extension}`;
};

const cutBytes = (text: string, maxBytes: number): string => {
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (new TextEncoder().encode(text.slice(0, mid)).length <= maxBytes) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    return text.slice(0, lo).trimEnd();
};

// 默认 $wgProhibitedFileExtensions；检查文件名的所有段（evil.php.png 的 php 也算）
const PROHIBITED_EXTENSIONS = new Set([
    "html",
    "htm",
    "js",
    "jsb",
    "mhtml",
    "mht",
    "xhtml",
    "xht",
    "php",
    "phtml",
    "php3",
    "php4",
    "php5",
    "phps",
    "phar",
    "shtml",
    "jhtml",
    "pl",
    "py",
    "cgi",
    "exe",
    "scr",
    "dll",
    "msi",
    "vbs",
    "bat",
    "com",
    "pif",
    "cmd",
    "vxd",
    "cpl",
    "xml",
]);

// 第一段是主体名，其后每段都算扩展名（大小写不敏感）；无点文件名恒不命中
const findProhibitedExtension = (name: string): string | null => {
    for (const segment of name.split(".").slice(1)) {
        const extension = segment.toLowerCase();
        if (PROHIBITED_EXTENSIONS.has(extension)) {
            return extension;
        }
    }
    return null;
};

export { stripFilePrefix, sanitizeFilename, dedupeFilename, findProhibitedExtension };
