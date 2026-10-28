import type { ApiParseResponse } from "types-mediawiki-response";
import { getApi } from "./api.ts";
import { CHANGE_TAG } from "./constants.ts";
import { describeSendError } from "./errors.ts";
import type { ApiRejectPayload } from "./errors.ts";
import type { SendResult } from "./types.ts";

/** 发送参数。 */
interface SendParams {
    /** 发帖目标页面（含命名空间） */
    page: string;
    /** 新话题的章节标题 */
    sectionTitle: string;
    /** 最终提交正文，已含 subst 改写（由 buildSubmitText 生成） */
    wikitext: string;
    /** 编辑摘要；空串表示不传该参数，由服务端自动生成 */
    summary: string;
}

/** 追加发帖（append 模式）的参数；章节标题由模板正文自带，无 sectionTitle。 */
interface AppendParams {
    /** 发帖目标页面（含命名空间） */
    page: string;
    /** 最终提交正文，已含 subst 改写（由 buildSubmitText 生成） */
    wikitext: string;
    /** 编辑摘要；空串表示不传该参数，由服务端自动生成 */
    summary: string;
}

/*
 * 发送域：提交新话题（postTopic）、追加自带标题的正文（appendTopic），
 * 以及发送成功后把用户带到新话题所需的锚点回读（fetchLastSectionAnchor）与跳转（newSectionUrl / gotoNewSection）。
 */
/**
 * 向目标页面追加一个新话题。
 *
 * action=discussiontoolsedit + paction=addtopic（requestDeletion 已在生产环境验证）。
 * summary 为空时不传该参数：addtopic 缺省由服务端按章节标题自动生成摘要。
 * 用 .then(onOk, onError) 而非 try/catch：postWithToken 以 (code, result, ...) 多参 reject，
 * await 只会拿到第一个参数（错误码），会丢掉 result.error.info。
 *
 * 失败不抛错，返回判别联合以便上层「重试」；成功时带回 newrevid，供上层回读新章节锚点。
 * @param params 发送参数
 * @returns 发送结果
 */
const postTopic = (params: SendParams): JQuery.Promise<SendResult> => {
    // summary 为空时不传该参数：addtopic 缺省由服务端按章节标题自动生成摘要
    const summary = params.summary === "" ? {} : { summary: params.summary };
    return getApi().postWithToken("csrf", {
        action: "discussiontoolsedit",
        paction: "addtopic",
        formatversion: 2,
        page: params.page,
        sectiontitle: params.sectionTitle,
        wikitext: params.wikitext,
        ...summary,
        assertuser: (mw.config.get("wgUserName") as string | null | undefined) ?? "",
        nocontent: "",
        watchlist: "nochange",
        tags: CHANGE_TAG,
    })
        .then((res: unknown) => ({
            ok: true as const,
            newrevid: (res as { discussiontoolsedit?: { newrevid?: number } } | undefined)?.discussiontoolsedit?.newrevid,
        }))
        .catch((code: string, result?: ApiRejectPayload | null) => {
            console.warn("[QuickRequest] 发送失败", code, result);
            // code "http" 是传输层失败(网络中断、超时):响应没回到客户端,服务端可能已提交。
            // addtopic 非幂等,自动重试可能重复发帖——标记 ambiguous,由上层换警示文案
            return { ok: false as const, code, detail: describeSendError(code, result), ambiguous: code === "http" };
        });
};

/**
 * 向目标页面追加一段自带章节标题的正文（userGroup 等申请类模板）。
 *
 * 这些模板的正文以 `== X申请 - User:{{subst:REVISIONUSER}} ==` 开头，标题在存盘替换时
 * 生成——addtopic 会再叠一层 sectiontitle 标题造成重复，故走 action=edit + appendtext：
 * 只追加正文，与现行入口 `section=new&nosummary=1`（隐藏标题框，MediaWiki 因此不写标题行）的
 * 保存结果一致。首尾各补一个换行与页尾内容分隔。
 * nocreate：版面页不存在时直接失败，避免凭空建出版面页。
 * summary 为空时不传该参数，由服务端自动生成。
 *
 * 失败处理与 postTopic 相同（.then/.catch 而非 try/catch 的原因见其注释）；
 * append 同样非幂等，传输层失败后的重试可能重复发帖，同样标记 ambiguous。
 * @param params 发送参数
 * @returns 发送结果
 */
const appendTopic = (params: AppendParams): JQuery.Promise<SendResult> => {
    const summary = params.summary === "" ? {} : { summary: params.summary };
    return getApi().postWithToken("csrf", {
        action: "edit",
        formatversion: 2,
        title: params.page,
        appendtext: `\n${params.wikitext}\n`,
        nocreate: true,
        assertuser: (mw.config.get("wgUserName") as string | null | undefined) ?? "",
        watchlist: "nochange",
        tags: CHANGE_TAG,
        ...summary,
    })
        .then((res: unknown) => ({
            ok: true as const,
            newrevid: (res as { edit?: { newrevid?: number } } | undefined)?.edit?.newrevid,
        }))
        .catch((code: string, result?: ApiRejectPayload | null) => {
            console.warn("[QuickRequest] 发送失败", code, result);
            return { ok: false as const, code, detail: describeSendError(code, result), ambiguous: code === "http" };
        });
};

/**
 * 读取指定修订里新话题的章节锚点。
 *
 * prop=sections 按文档顺序列出目录;最后一个章节未必是新话题——用户粘贴的内容或
 * 后续阶段的模板正文可能自带标题,故先按章节标题文本(line)匹配,匹配不到再退回
 * 最后一项(新话题追加在页尾,正文无标题时最后一项即它)。传 oldid 而非 page,
 * 是为了把解析固定在刚保存的修订上,避免期间有人编辑导致目录位移。
 *
 * append 模式传 undefined 直接取最后一项——正文自带的标题含存盘时才替换的
 * 魔法字（{{subst:REVISIONUSER}} 等），客户端拼不出准确文本，而追加必在页尾。
 *
 * 取不到时返回空串(例如章节被合并进上一节),由调用方退化为不带锚点的跳转。
 * @param revid 刚保存的修订 ID
 * @param sectionTitle 新话题的章节标题；append 模式省略
 * @returns 章节锚点；取不到时为空字符串
 */
const fetchLastSectionAnchor = async (revid: number | undefined, sectionTitle?: string): Promise<string> => {
    if (!revid) {
        return "";
    }
    try {
        const res = await getApi().post({
            action: "parse",
            oldid: revid,
            prop: "sections",
            formatversion: 2,
        }) as Partial<ApiParseResponse>;
        const sections = res.parse?.sections ?? [];
        const matched = sectionTitle === undefined
            ? sections.at(-1)
            : sections.filter((section) => section.line === sectionTitle).at(-1) ?? sections.at(-1);
        return matched?.anchor ?? "";
    } catch (error) {
        console.warn("[QuickRequest] 读取新章节锚点失败", error);
        return "";
    }
};

/**
 * 目标页面新话题的 URL。锚点为空时只给页面本身。
 * @param page 目标页面名
 * @param anchor 章节锚点
 * @returns URL
 */
const newSectionUrl = (page: string, anchor: string): string => {
    const url = mw.util.getUrl(page);
    return anchor === "" ? url : `${url}#${encodeURIComponent(anchor)}`;
};

/**
 * 在当前标签页跳到目标页面的新话题。
 *
 * 已经身处目标页面时不能直接 location.assign：只有 hash 不同属同文档导航，页面不会重新加载，
 * 而新话题并不在现有 DOM 里，浏览器只会静默地不滚动。故先写入 hash 再 reload，让新文档按锚点定位。
 * @param page 目标页面名
 * @param anchor 章节锚点；为空时跳到页面顶部
 */
const gotoNewSection = (page: string, anchor: string): void => {
    const url = newSectionUrl(page, anchor);
    if ((mw.config.get("wgPageName") as string | undefined) === page.replace(/ /g, "_")) {
        location.hash = new URL(url, location.href).hash;
        location.reload();
        return;
    }
    location.assign(url);
};

export { type AppendParams, fetchLastSectionAnchor, gotoNewSection, newSectionUrl, postTopic, appendTopic, type SendParams };
