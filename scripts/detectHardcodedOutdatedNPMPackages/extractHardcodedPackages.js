/**
 * 从源码文本中提取 npm CDN 上固定版本的硬编码包引用（`pkg@version`），去重后返回。
 *
 * 支持的主机与路径形态：
 * - `npm.elemecdn.com/<pkg>@<version>/...`
 * - `[*.]jsdelivr.net/npm/<pkg>@<version>/...`（`/gh/`、`/combine/` 等非 npm 路径忽略）
 * - `unpkg.com/<pkg>@<version>/...`
 *
 * 以上均支持作用域包（`@scope/pkg@<version>`）与协议相对写法（`//host/...`）。
 * 带 tag 的引用（`@latest`、`@browser` 等）和无版本引用有意忽略：它们本来就跟随最新版，
 * 不属于「硬编码的过时版本」，也无法用 semver 比较。
 * @param {string} content 源码文本
 * @returns {string[] | null} 包引用列表；无匹配时返回 null（与 String.match 语义一致）
 */
const cdnRules = [
    { host: "npm.elemecdn.com", prefix: "/" },
    { hostSuffix: "jsdelivr.net", prefix: "/npm/" },
    { host: "unpkg.com", prefix: "/" },
];
// 要求主机名带点，避免把代码片段（如 `//Rollback</code>`）误认成协议相对 URL
const urlRegExp = /(?:https?:)?\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s"'`()[\]]*/gi;
// 版本须以数字（可带 v 前缀）开头；`latest`、`browser` 这类 tag 由此排除
const versionRegExp = /^v?\d+(?:\.\d+)*(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i;

/**
 * 从 URL 路径中取出 `pkg@version` 形态的 spec，作用域包会连同第二段（包名）一起取出。
 * @param {string} pathname URL 路径
 * @param {string} prefix spec 之前的路径前缀
 * @returns {string | null} spec；路径不符合该 CDN 的 npm 形态时返回 null
 */
const getSpec = (pathname, prefix) => {
    if (!pathname.startsWith(prefix)) {
        return null;
    }
    const segments = pathname.slice(prefix.length).split("/");
    if (segments[0].startsWith("@")) {
        return segments.length > 1 && segments[1].length > 0 ? `${segments[0]}/${segments[1]}` : null;
    }
    return segments[0];
};

export default (content) => {
    const packages = new Set();
    for (const url of content.match(urlRegExp) ?? []) {
        let parsedUrl;
        try {
            parsedUrl = new URL(url, "https://invalid.example");
        } catch {
            continue;
        }
        for (const { host, hostSuffix, prefix } of cdnRules) {
            const isHostMatched = host
                ? parsedUrl.hostname === host
                : parsedUrl.hostname === hostSuffix || parsedUrl.hostname.endsWith(`.${hostSuffix}`);
            if (!isHostMatched) {
                continue;
            }
            const spec = getSpec(parsedUrl.pathname, prefix);
            if (spec === null) {
                continue;
            }
            // 用最后一个 @ 切分：作用域包名本身以 @ 开头（`@scope/pkg@1.0.0`）
            const atIndex = spec.lastIndexOf("@");
            if (atIndex <= 0) {
                continue;
            }
            const pkg = spec.slice(0, atIndex);
            const version = spec.slice(atIndex + 1);
            if (!versionRegExp.test(version)) {
                continue;
            }
            packages.add(`${pkg}@${version}`);
        }
    }
    return packages.size === 0 ? null : [...packages];
};
