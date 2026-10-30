import { getApi } from "./api.ts";

/** list=users&usprop=blockinfo 返回的单个用户条目（只关心封禁相关字段）。 */
interface BlockInfoUser {
    /** 封禁编号；未被封禁时缺失 */
    blockid?: number;
    /** 执行封禁的管理员 */
    blockedby?: string;
    /** 封禁原因 */
    blockreason?: string;
    /** 期满时刻（API 原始形态：infinite 或 ISO 时间） */
    blockexpiry?: string;
    /** 封禁开始时间的本地化文案 */
    blockedtimestampformatted?: string;
    /** 封禁期满时间的本地化文案 */
    blockexpiryformatted?: string;
}

/**
 * 把 blockinfo 查询结果拼成「封禁信息」文本。
 * 逐字沿用现行 Widget:BlockedUserHelp 的拼装——这段文本会经模板原样存进讨论页，
 * 处理申诉的维护者已经习惯这个格式，不应随迁移改变。
 * 文案为简体，与现行 Widget 一致；保存后的正文由站内语言转换处理繁简。
 * @param user 查询返回的用户条目
 * @returns 封禁信息文本；未被封禁（无封禁编号或执行人）时为 null
 */
const formatBlockInfo = (user: BlockInfoUser): string | null => {
    if (user.blockid === undefined || user.blockedby === undefined) {
        return null;
    }
    const reason = user.blockreason?.replaceAll("\n", "") ?? "";
    let text = `该用户已被封禁，执行封禁的人员是[[U:${user.blockedby}|${user.blockedby}]]。封禁原因是：''${reason === "" ? "未给出原因" : reason}''。\n`;
    text += `* 封禁开始时间：${user.blockedtimestampformatted ?? ""}\n`;
    text += `* 封禁期满时间：${user.blockexpiry === "infinite" ? "无限期" : user.blockexpiryformatted ?? ""}\n`;
    text += `* 封禁编号：#${user.blockid}`;
    return text;
};

/** list=blocks&bkusers= 返回的单个封禁条目（同账号可并存多个部分封禁；无 formatted 字段）。 */
interface BlockEntry {
    /** 封禁编号 */
    blockid?: number;
    /** 执行封禁的管理员 */
    by?: string;
    /** 封禁原因 */
    reason?: string;
    /** 期满时刻（API 原始形态：infinite 或 ISO 时间） */
    expiry?: string;
}

/**
 * 把 blockinfo 主封禁之外的并行封禁追加为列表行（第五轮评审补充：同账号可并存
 * 多个部分封禁，blockinfo 只报一条）。blocks 查询没有本地化格式化的时间字段
 * （区别于 users 查询的 *formatted），期满如实使用 API 原始值；原因处理与主封禁一致。
 * @param blocks 并行封禁条目（调用方已按主封禁 blockid 去重）
 * @returns 追加行；空清单为空串
 */
const formatExtraBlocks = (blocks: BlockEntry[]): string => blocks
    .filter((block): block is BlockEntry & { blockid: number } => block.blockid !== undefined)
    .map((block) => {
        const reason = block.reason?.replaceAll("\n", "") ?? "";
        const expiry = block.expiry === "infinite" || block.expiry === undefined ? "无限期" : `期满 ${block.expiry}`;
        return `* 并行封禁 #${block.blockid}：${expiry}，原因：${reason === "" ? "未给出原因" : reason}`;
    })
    .join("\n");

/**
 * 查询当前用户的封禁状态并拼出封禁信息。主查询与现行 Widget:BlockedUserHelp 是同一条
 * （action=query&list=users&usprop=blockinfo，按当前用户名查）；在此之上补查
 * list=blocks&bkusers= 列出同账号并行的其余封禁（失败或为空不影响主信息）。
 * 注：IP 侧自动封禁的受害者在客户端拿不到自身 IP，无法枚举，不在本查询覆盖内。
 * @returns 封禁信息文本；当前未被账号级封禁时为 null
 * @throws 主查询失败（网络错误等）时抛出
 */
const fetchBlockInfoText = async (): Promise<string | null> => {
    const userName = (mw.config.get("wgUserName") as string | null | undefined) ?? "";
    const res = await getApi().post({
        action: "query",
        list: "users",
        usprop: "blockinfo",
        ususers: userName,
        formatversion: 2,
    }) as { query?: { users?: BlockInfoUser[] } };
    const user = res.query?.users?.[0] ?? {};
    const primary = formatBlockInfo(user);
    if (primary === null) {
        return null;
    }
    let extras: BlockEntry[] = [];
    try {
        const blocksRes = await getApi().post({
            action: "query",
            list: "blocks",
            bkusers: userName,
            bkprop: "id|by|reason|expiry",
            formatversion: 2,
        }) as { query?: { blocks?: BlockEntry[] } };
        extras = (blocksRes.query?.blocks ?? []).filter((block) => block.blockid !== user.blockid);
    } catch (error) {
        console.warn("[QuickRequest] 并行封禁查询失败", error);
    }
    const extraText = formatExtraBlocks(extras);
    return extraText === "" ? primary : `${primary}\n${extraText}`;
};

export { type BlockEntry, type BlockInfoUser, fetchBlockInfoText, formatBlockInfo };
