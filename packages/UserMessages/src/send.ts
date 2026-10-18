import type { ApiEditResponse, ApiParseResponse } from "types-mediawiki-response";
import { api } from "./api.ts";
import { talkPageTitle } from "./constants.ts";
import { describeSendError } from "./errors.ts";
import type { ApiRejectPayload } from "./errors.ts";
import type { SendResult } from "./types.ts";

/** 发送参数。 */
interface SendParams {
    /** 目标用户（不含 User talk: 前缀） */
    targetUser: string;
    /** 最终提交正文，已含 subst 改写与签名（由 buildSubmitText 生成） */
    text: string;
    /** 编辑摘要 */
    summary: string;
}

/*
 * 发送域：提交新章节（sendEdit），以及发送成功后把用户带到新章节所需的锚点回读
 * （fetchLastSectionAnchor）与跳转（newSectionUrl / gotoNewSection）。
 */
/**
 * 向目标用户讨论页追加一个新章节。
 *
 * 用 .then(onOk, onError) 而非 try/catch：postWithToken 以 (code, result, ...) 多参 reject，
 * await 只会拿到第一个参数（错误码），会丢掉 result.error.info。
 *
 * 失败不抛错，返回判别联合以便上层「重试」；成功时带回 newrevid，供上层回读新章节锚点。
 * @param params 发送参数
 * @returns 发送结果
 */
const sendEdit = (params: SendParams): JQuery.Promise<SendResult> => api
    .postWithToken("csrf", {
        action: "edit",
        assertuser: (mw.config.get("wgUserName") as string | null | undefined) ?? "",
        formatversion: 2,
        title: talkPageTitle(params.targetUser),
        section: "new",
        sectiontitle: "",
        text: params.text,
        summary: params.summary,
        tags: "Automation tool|UserMessages",
    })
    .then((res: unknown) => ({ ok: true as const, newrevid: (res as Partial<ApiEditResponse> | undefined)?.edit?.newrevid }))
    .catch((code: string, result?: ApiRejectPayload | null) => {
        console.warn("[UserMessages] 发送失败", code, result);
        return { ok: false as const, code, detail: describeSendError(code, result) };
    });

/**
 * 读取指定修订里最后一个章节的锚点。
 *
 * 新章节的标题由模板自身给出（如「提醒：请勿人身攻击」），小工具事先无从得知，所以锚点只能保存后回读：
 * prop=sections 按文档顺序列出目录，而新章节是追加在页尾的，故最后一项就是刚发出的那节。
 * 传 oldid 而非 page，是为了把解析固定在刚保存的修订上，避免期间有人编辑导致目录位移。
 *
 * 取不到时返回空串（例如模板本身没有标题，内容会并入上一节），由调用方退化为不带锚点的跳转。
 * @param revid 刚保存的修订 ID
 * @returns 章节锚点；取不到时为空串
 */
const fetchLastSectionAnchor = async (revid: number | undefined): Promise<string> => {
    if (!revid) {
        return "";
    }
    try {
        const res = await api.post({
            action: "parse",
            oldid: revid,
            prop: "sections",
            formatversion: 2,
        }) as Partial<ApiParseResponse>;
        const sections = res.parse?.sections ?? [];
        return sections.at(-1)?.anchor ?? "";
    } catch (error) {
        console.warn("[UserMessages] 读取新章节锚点失败", error);
        return "";
    }
};

/**
 * 目标用户讨论页新章节的 URL。锚点为空时只给讨论页。
 * @param user 用户名，不含命名空间前缀
 * @param anchor 章节锚点
 * @returns URL
 */
const newSectionUrl = (user: string, anchor: string): string => {
    const url = mw.util.getUrl(talkPageTitle(user));
    return anchor === "" ? url : `${url}#${encodeURIComponent(anchor)}`;
};

/**
 * 在当前标签页跳到目标用户讨论页的新章节。
 *
 * 已经身处目标讨论页时不能直接 location.assign：只有 hash 不同属同文档导航，页面不会重新加载，
 * 而新章节并不在现有 DOM 里，浏览器只会静默地不滚动。故先写入 hash 再 reload，让新文档按锚点定位。
 * @param user 用户名，不含命名空间前缀
 * @param anchor 章节锚点；为空时跳到讨论页顶部
 */
const gotoNewSection = (user: string, anchor: string): void => {
    const url = newSectionUrl(user, anchor);
    if ((mw.config.get("wgPageName") as string | undefined) === talkPageTitle(user).replace(/ /g, "_")) {
        location.hash = new URL(url, location.href).hash;
        location.reload();
        return;
    }
    location.assign(url);
};

export { fetchLastSectionAnchor, gotoNewSection, newSectionUrl, type SendParams, sendEdit };
