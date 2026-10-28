import { describe, expect, it } from "vitest";
import { formatBlockInfo } from "../src/blockInfo.ts";

describe("formatBlockInfo", () => {
    it("按现行 Widget:BlockedUserHelp 的格式拼出封禁信息", () => {
        expect(formatBlockInfo({
            blockid: 13390,
            blockedby: "没有羽翼的格雷塔",
            blockreason: "添加违反内容管理方针的内容",
            blockexpiry: "infinite",
            blockedtimestampformatted: "2026年10月23日 (五) 21:37",
            blockexpiryformatted: "",
        })).toBe(
            "该用户已被封禁，执行封禁的人员是[[U:没有羽翼的格雷塔|没有羽翼的格雷塔]]。封禁原因是：''添加违反内容管理方针的内容''。\n"
            + "* 封禁开始时间：2026年10月23日 (五) 21:37\n"
            + "* 封禁期满时间：无限期\n"
            + "* 封禁编号：#13390",
        );
    });

    it("有限期封禁用格式化的期满时间", () => {
        const text = formatBlockInfo({
            blockid: 13392,
            blockedby: "没有羽翼的格雷塔",
            blockreason: "屡次剪切移动既有页顶模板",
            blockexpiry: "2026-10-30T00:00:00Z",
            blockedtimestampformatted: "2026年10月23日 (五) 21:37",
            blockexpiryformatted: "2026年10月30日 (五) 00:00",
        });
        expect(text).toContain("* 封禁期满时间：2026年10月30日 (五) 00:00");
    });

    it("封禁原因里的换行被去掉", () => {
        const text = formatBlockInfo({
            blockid: 1,
            blockedby: "A",
            blockreason: "第一行\n第二行",
            blockexpiry: "infinite",
            blockedtimestampformatted: "t",
            blockexpiryformatted: "",
        });
        expect(text).toContain("''第一行第二行''");
    });

    it("未给出封禁原因时显示「未给出原因」", () => {
        const text = formatBlockInfo({
            blockid: 2,
            blockedby: "B",
            blockexpiry: "infinite",
            blockedtimestampformatted: "t",
            blockexpiryformatted: "",
        });
        expect(text).toContain("''未给出原因''");
    });

    it("未被封禁（无封禁编号或执行人）时返回 null", () => {
        expect(formatBlockInfo({})).toBeNull();
        expect(formatBlockInfo({ blockreason: "x" })).toBeNull();
        expect(formatBlockInfo({ blockid: 3 })).toBeNull();
    });
});
