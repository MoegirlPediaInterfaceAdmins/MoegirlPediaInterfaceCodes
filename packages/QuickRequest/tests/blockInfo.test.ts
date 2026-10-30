import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApi } from "../src/api.ts";
import type * as ApiModule from "../src/api.ts";
import { fetchBlockInfoText, formatBlockInfo } from "../src/blockInfo.ts";

// fetchBlockInfoText 依赖 mw.Api；只桩掉 getApi，其余导出保持原实现
vi.mock("../src/api.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof ApiModule>();
    return { ...actual, getApi: vi.fn() };
});

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

describe("fetchBlockInfoText 的并行封禁合并", () => {
    // fetchBlockInfoText 读 mw.config 的 wgUserName（node 环境无 mw，桩成固定用户）
    beforeEach(() => {
        vi.stubGlobal("mw", { config: { get: (): string | null => "Tester" } });
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const primaryEntry = {
        blockid: 13390,
        blockedby: "没有羽翼的格雷塔",
        blockreason: "主封禁",
        blockexpiry: "infinite",
        blockedtimestampformatted: "2026年10月23日 (五) 21:37",
        blockexpiryformatted: "",
    };
    /** 按入参动作分流的查询桩：users 查询回 primaryEntry，blocks 查询回给定清单（或抛错）。 */
    const mockQueries = (blocks: unknown[] | "fail") => {
        const post = vi.fn((params: { list?: string }) => {
            if (params.list === "blocks") {
                return blocks === "fail" ? Promise.reject(new Error("network")) : Promise.resolve({ query: { blocks } });
            }
            return Promise.resolve({ query: { users: [primaryEntry] } });
        });
        vi.mocked(getApi).mockReturnValue({ post } as never);
        return post;
    };

    it("blockinfo 之外的同账号封禁以「并行封禁」行追加，主封禁按 blockid 去重", async () => {
        const post = mockQueries([
            { blockid: 13390, by: "没有羽翼的格雷塔", reason: "主封禁", expiry: "infinite" },
            { blockid: 13395, by: "另一位管理员", reason: "部分封禁\n跨行原因", expiry: "2026-11-05T12:00:00Z" },
        ]);
        const text = await fetchBlockInfoText();
        expect(text).toContain("* 封禁编号：#13390");
        expect(text).toContain("* 并行封禁 #13395：期满 2026-11-05T12:00:00Z，原因：部分封禁跨行原因");
        // 两条查询都发出（list=users 主查询 + list=blocks 并行封禁查询）
        expect(post.mock.calls.some(([params]) => params.list === "users")).toBe(true);
        expect(post.mock.calls.some(([params]) => params.list === "blocks")).toBe(true);
    });

    it("并行封禁查询失败或无额外条目时保持主封禁文本不变", async () => {
        mockQueries([{ blockid: 13390, by: "没有羽翼的格雷塔", reason: "主封禁", expiry: "infinite" }]);
        const onlyPrimary = await fetchBlockInfoText();
        expect(onlyPrimary).not.toContain("并行封禁");

        mockQueries("fail");
        const failed = await fetchBlockInfoText();
        expect(failed).toContain("* 封禁编号：#13390");
        expect(failed).not.toContain("并行封禁");
    });

    it("无限期的并行封禁标注「无限期」，缺原因显示「未给出原因」", async () => {
        mockQueries([
            { blockid: 2, by: "A", reason: "", expiry: "infinite" },
        ]);
        const text = await fetchBlockInfoText();
        expect(text).toContain("* 并行封禁 #2：无限期，原因：未给出原因");
    });
});
