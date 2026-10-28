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

/**
 * 查询当前用户的封禁状态并拼出封禁信息。与现行 Widget:BlockedUserHelp 是同一条查询
 * （action=query&list=users&usprop=blockinfo，按当前用户名查），行为完全对齐。
 * @returns 封禁信息文本；当前未被账号级封禁时为 null
 * @throws 查询失败（网络错误等）时抛出
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
    return formatBlockInfo(res.query?.users?.[0] ?? {});
};

export { type BlockInfoUser, fetchBlockInfoText, formatBlockInfo };
