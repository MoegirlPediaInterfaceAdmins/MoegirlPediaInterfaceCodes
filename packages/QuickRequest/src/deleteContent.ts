import { getApi, getApiForSite, isZhHost } from "./api.ts";
import { titleSuffix } from "./constants.ts";
import { getPreference } from "./storage.ts";
import type { DropdownOption, QuickRequestContext, RequestParam, SiteId } from "./types.ts";

/**
 * 删除请求的内容构建（阶段 4，requestDeletion 并入）。
 * 正文为手工拼装的纯文本而非模板调用，故 delete 类型走程序化表单：
 * 字段定义（buildDeleteParams）与正文/标题构建（buildDeleteBody / buildDeleteSectionTitle）
 * 都在代码里，不经过站内配置页。拼装格式与旧 Gadget-requestDeletion 逐字一致。
 */

/** 批量清单解析后的单个页面：title 是正文里的写法，queryTitle 是拿去查重定向的写法。 */
interface BatchPage {
    title: string;
    queryTitle: string;
    site: SiteId;
}

/** 重定向检测后的页面（正文列表用）。 */
interface ResolvedPage {
    title: string;
    isRedirect: boolean;
}

/** 当前站 id：删除请求从共享站发起时发到主站版面，页面名侧的前缀按当前站分流。 */
const currentSite = (): SiteId => isZhHost() ? "zh" : "commons";

/**
 * 被申请删除的页面在正文/标题中的链接目标：共享站页面加 cm: 前缀（发帖版面的页名不加，
 * 与旧工具的预填行为一致）。
 * @param pageName 当前页面名（含命名空间，下划线形式）
 * @param site 当前站
 * @returns 链接目标
 */
const linkedPageNameFor = (pageName: string, site: SiteId): string => site === "zh" ? pageName : `cm:${pageName}`;

/**
 * 单页提删的正文。
 * @param linkedPageName 链接目标（共享站页面已带 cm: 前缀）
 * @param isRedirect 当前页是否为重定向页（重定向页用 NoRedirectLink，避免链接落到目标页）
 * @param reason 申请理由
 * @param detail 详细原因；空串时整行不输出
 * @returns 正文 wikitext
 */
const buildSingleBody = (linkedPageName: string, isRedirect: boolean, reason: string, detail: string): string => {
    const lines = [
        `* '''页面标题'''：${isRedirect ? `{{NoRedirectLink|${linkedPageName}}}` : `[[:${linkedPageName}]]`}`,
        `* '''申请理由'''：${reason}`,
    ];
    if (detail !== "") {
        lines.push(`* '''详细原因'''：${detail}`);
    }
    lines.push("~~~~");
    return lines.join("\n");
};

/**
 * 批量提删的正文。
 * @param pages 已检测过重定向的页面清单（顺序保持输入顺序）
 * @param reason 申请理由
 * @param detail 详细原因；空串时整行不输出
 * @returns 正文 wikitext
 */
const buildBatchBody = (pages: ResolvedPage[], reason: string, detail: string): string => {
    const lines = [
        "* '''页面标题'''：",
        ...pages.map(({ title, isRedirect }) => `** ${isRedirect ? `{{NoRedirectLink|${title}}}` : `[[:${title}]]`}`),
        `* '''申请理由'''：${reason}`,
    ];
    if (detail !== "") {
        lines.push(`* '''详细原因'''：${detail}`);
    }
    lines.push("~~~~");
    return lines.join("\n");
};

/**
 * 解析批量提删的页面清单：一行一个页面，忽略空行并按最终标题去重。
 * @param text 多行文本框的内容
 * @param site 当前站（无前缀行的归属站点）
 * @throws {Error} 存在仅有前缀或含非法字符的行时，文案列出全部非法行
 * @returns 待提交的页面清单
 */
const parseBatchPages = (text: string, site: SiteId): BatchPage[] => {
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
    const invalidLines = lines.filter((line) => {
        const stripped = line.replace(/^(?:cm:|zhmoe:)/i, "");
        return stripped === "" || /[|[\]{}<>]/.test(stripped);
    });
    if (invalidLines.length > 0) {
        throw new Error(wgULS(
            `以下页面标题无效（仅有前缀，或含 | [ ] { } < > 等字符）：${invalidLines.join("、")}`,
            `以下頁面標題無效（僅有前綴，或含 | [ ] { } < > 等字元）：${invalidLines.join("、")}`,
        ));
    }
    const toBatchPage = (line: string): BatchPage => {
        if (/^zhmoe:/i.test(line)) {
            const title = line.substring(6);
            return { title, queryTitle: title, site: "zh" };
        }
        if (/^cm:/i.test(line)) {
            return { title: line, queryTitle: line.substring(3), site: "commons" };
        }
        return site === "zh"
            ? { title: line, queryTitle: line, site: "zh" }
            : { title: `cm:${line}`, queryTitle: line, site: "commons" };
    };
    const result: BatchPage[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
        const page = toBatchPage(line);
        if (!seen.has(page.title)) {
            seen.add(page.title);
            result.push(page);
        }
    }
    return result;
};

/**
 * 批量查询用的标题归一化：下划线转空格、折叠连续空白、仅首字符为小写字母时大写——
 * 与 MediaWiki 标题规范化在 API normalized/redirects 对照场景下的既有做法一致。
 * @param title 原始标题
 * @returns 归一化标题
 */
const normalizeBatchTitle = (title: string): string => title.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/^[a-z]/, (char) => char.toUpperCase());

/**
 * 把查询得到的归一化映射与重定向集合应用到页面清单。
 * @param pages 已解析的页面清单
 * @param normalizedTitles 键为归一化的 from、值为 normalized 目标的映射
 * @param redirectTitles 归一化形态的重定向来源集合
 * @returns 与入参顺序一致的检测结果
 */
const applyRedirectInfo = (pages: BatchPage[], normalizedTitles: Map<string, string>, redirectTitles: Set<string>): ResolvedPage[] =>
    pages.map(({ title, queryTitle }) => {
        const normalized = normalizeBatchTitle(queryTitle);
        return { title, isRedirect: redirectTitles.has(normalizedTitles.get(normalized) ?? normalized) };
    });

/**
 * 批量查询页面清单中各页面是否为重定向页（按站点分流、50 个一批；查询失败按非重定向继续）。
 * @param pages 已解析的页面清单
 * @returns 与入参顺序一致的检测结果
 */
const resolveBatchPages = async (pages: BatchPage[]): Promise<ResolvedPage[]> => {
    const normalizedTitles = new Map<string, string>();
    const redirectTitles = new Set<string>();
    const titlesBySite = new Map<SiteId, string[]>();
    for (const { queryTitle, site } of pages) {
        const list = titlesBySite.get(site) ?? [];
        list.push(queryTitle);
        titlesBySite.set(site, list);
    }
    await Promise.all([...titlesBySite].map(async ([site, titles]) => {
        const unique = [...new Set(titles)];
        const batches = Array.from({ length: Math.ceil(unique.length / 50) }, (_, index) => unique.slice(index * 50, index * 50 + 50));
        await Promise.all(batches.map(async (batch) => {
            try {
                const res = await getApiForSite(site).post({
                    action: "query",
                    titles: batch.join("|"),
                    redirects: true,
                    formatversion: 2,
                }) as { query?: { normalized?: { from: string; to: string }[]; redirects?: { from: string }[] } };
                for (const { from, to } of res.query?.normalized ?? []) {
                    normalizedTitles.set(normalizeBatchTitle(from), to);
                }
                for (const { from } of res.query?.redirects ?? []) {
                    redirectTitles.add(normalizeBatchTitle(from));
                }
            } catch (error) {
                console.warn("[QuickRequest] 批量查询重定向失败", error);
            }
        }));
    }));
    return applyRedirectInfo(pages, normalizedTitles, redirectTitles);
};

/**
 * 删除请求的章节标题：单页为「请求删除页面：[[页面]] - 用户 - 日期」，批量为「批量删除请求 - 用户 - 日期」。
 * @param values 表单值（batch 为 "1" 时走批量标题）
 * @param ctx 上下文（页面名、用户名、日期）
 * @param site 当前站
 * @returns 章节标题
 */
const buildDeleteSectionTitle = (values: Record<string, string>, ctx: QuickRequestContext, site: SiteId): string => {
    const suffix = titleSuffix(ctx.userName, ctx.now);
    if (values.batch === "1") {
        return `批量删除请求${suffix}`;
    }
    return `请求删除页面：[[${linkedPageNameFor(ctx.pageName, site)}]]${suffix}`;
};

/**
 * 删除请求的正文（程序化表单的 buildBody）。
 * 理由与详情的组合沿袭旧工具：只填详情时详情即理由；两者都填时详情单列为详细原因。
 * @param values 表单值
 * @param ctx 上下文
 * @returns 正文 wikitext
 * @throws {Error} 批量清单为空或含非法行时
 */
const buildDeleteBody = async (values: Record<string, string>, ctx: QuickRequestContext): Promise<string> => {
    // 理由与详情的组合沿袭旧工具：只填详情时详情即理由；两者都填时详情单列为详细原因
    const reason = values.reason;
    const detail = values.detail;
    const requestReason = reason !== "" ? reason : detail;
    const requestDetail = reason !== "" ? detail : "";
    const site = currentSite();
    if (values.batch === "1") {
        const pages = parseBatchPages(values.pages, site);
        if (pages.length === 0) {
            throw new Error(wgULS("请至少填写一个页面", "請至少填寫一個頁面"));
        }
        return buildBatchBody(await resolveBatchPages(pages), requestReason, requestDetail);
    }
    return buildSingleBody(linkedPageNameFor(ctx.pageName, site), ctx.isRedirect, requestReason, requestDetail);
};

/** 当前会话的 autopatrol 权限查询（批量提删字段据此显隐）；失败按无权限处理。 */
let autopatrolPromise: Promise<boolean> | null = null;

const checkAutopatrol = (): Promise<boolean> => {
    // mw.user.getRights() 返回 jQuery Promise，包一层原生 Promise 统一类型
    autopatrolPromise ??= new Promise<boolean>((resolve) => {
        mw.user.getRights()
            .then((rights: string[]) => {
                resolve(rights.includes("autopatrol"));
            })
            .catch((error: unknown) => {
                console.warn("[QuickRequest] 获取用户权限失败，按无 autopatrol 权限处理", error);
                resolve(false);
            });
    });
    return autopatrolPromise;
};

/**
 * 解析理由下拉选项：parse 渲染 MediaWiki:Filedelete-reason-dropdown（File 命名空间）或
 * MediaWiki:Deletereason-dropdown（其余页面），从渲染 HTML 的列表结构提取——
 * 带子列表的 li 是分组标题（optgroup），叶子 li 的文本是选项。与旧工具同一来源与同一解析。
 * 解析失败返回空数组：下拉仅剩「其他」，详情仍可自由填写，不让对话框整体失败。
 * @returns 下拉选项
 */
const fetchReasonOptions = async (): Promise<DropdownOption[]> => {
    try {
        const wgNamespaceNumber = mw.config.get("wgNamespaceNumber");
        const wgNamespaceIds = mw.config.get("wgNamespaceIds");
        const page = wgNamespaceNumber === wgNamespaceIds.file ? "MediaWiki:Filedelete-reason-dropdown" : "MediaWiki:Deletereason-dropdown";
        const res = await getApi().post({
            action: "parse",
            page,
            prop: "text",
            formatversion: 2,
        }) as { parse?: { text?: string } };
        const $container = $("<div>").html(res.parse?.text ?? "");
        const options: DropdownOption[] = [];
        const pushOption = (element: HTMLElement): void => {
            const text = element.innerText.trim();
            options.push({ data: text, label: text });
        };
        $container.children(".mw-parser-output").children("ul").children("li").each((_, element) => {
            const $element = $(element);
            if ($element.children("ul").length > 0) {
                // 分组项：li 自身的文本（去掉子列表后剩下的部分）
                options.push({ optgroup: $element.clone().find("*").remove().end().text().trim() });
                $element.children("ul").children("li").each((__, child) => {
                    pushOption(child);
                });
            } else {
                pushOption(element);
            }
        });
        return options;
    } catch (error) {
        console.warn("[QuickRequest] 理由下拉加载失败", error);
        return [];
    }
};

/**
 * 「按回车提交」偏好的当前值。读取先走 QuickRequest 存储键，未写过时回退旧
 * requestDeletion 存储键（旧值可能是布尔，统一转字符串再判）。
 * @returns "1"（开启）或 ""
 */
const readEnterPreference = (): "1" | "" => {
    const value = getPreference("enterToSubmit", { name: "AnnTools-requestDeletion", key: "enterToSubmit" });
    return value !== null && value !== "" && value !== "false" ? "1" : "";
};

/**
 * 删除请求的表单字段（程序化表单的 buildParams）。
 * 理由下拉选项与 autopatrol 权限在打开对话框时并行获取；批量字段（勾选框 + 清单）
 * 仅 autopatrol 用户可得；「按回车提交」是持久偏好（不进入正文）。
 * @returns 参数定义
 */
const buildDeleteParams = async (): Promise<RequestParam[]> => {
    const [options, hasAutopatrol] = await Promise.all([fetchReasonOptions(), checkAutopatrol()]);
    const site = currentSite();
    const params: RequestParam[] = [
        {
            key: "reason",
            label: wgULS("删除理由", "刪除理由"),
            type: "dropdown",
            options: [{ data: "", label: wgULS("其他（请自行说明理由）", "其他（請自行說明理由）") }, ...options],
        },
        { key: "detail", label: wgULS("详情", "詳情"), type: "text", enterSubmits: true },
    ];
    if (hasAutopatrol) {
        params.push({ key: "batch", label: wgULS("批量提删", "批次提刪"), type: "checkbox" });
        params.push({
            key: "pages",
            label: wgULS("待删除页面", "待刪除頁面"),
            type: "multiline",
            placeholder: site === "zh"
                ? wgULS("一行一个主站页面，不需要添加[[ ]]，不自动包含当前页面；\n共享站页面请加 cm: 前缀", "一行一個主站頁面，不需要添加[[ ]]，不自動包含當前頁面；\n共享站頁面請加 cm: 前綴")
                : wgULS("一行一个共享站页面，不需要添加[[ ]]，不自动包含当前页面；\n主站页面请加 zhmoe: 前缀", "一行一個共享站頁面，不需要添加[[ ]]，不自動包含當前頁面；\n主站頁面請加 zhmoe: 前綴"),
            visibleIf: { param: "batch", equals: "1" },
        });
    }
    params.push({
        key: "enterToSubmit",
        label: wgULS("理由详情按回车提交（浏览器级设置）", "理由詳情按確認鍵提交（瀏覽器級設置）"),
        type: "checkbox",
        "default": readEnterPreference(),
        storageKey: "enterToSubmit",
    });
    return params;
};

export { applyRedirectInfo, buildBatchBody, buildDeleteBody, buildDeleteParams, buildDeleteSectionTitle, buildSingleBody, normalizeBatchTitle, parseBatchPages };

export type { BatchPage, ResolvedPage };
