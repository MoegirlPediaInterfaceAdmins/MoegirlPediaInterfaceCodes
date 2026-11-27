import { describe, expect, it } from "vitest";
import { runPool } from "../../modules/runPool.js";

describe("runPool", () => {
    it("全部任务成功时返回空失败列表", async () => {
        const seen = [];
        const failures = await runPool(["a", "b", "c"], 2, (item) => {
            seen.push(item);
        });
        expect(failures).toEqual([]);
        expect(seen.toSorted()).toEqual(["a", "b", "c"]);
    });

    it("任意时刻的并发数不超过上限", async () => {
        let running = 0;
        let peak = 0;
        await runPool([1, 2, 3, 4, 5, 6, 7], 2, async () => {
            running++;
            peak = Math.max(peak, running);
            // 让出事件循环，使其他 worker 有机会同时进入
            await new Promise((resolve) => {
                setTimeout(resolve, 5);
            });
            running--;
        });
        expect(peak).toBe(2);
    });

    it("单个任务失败不中断其余任务，失败项与错误按发生顺序返回", async () => {
        const seen = [];
        const firstError = new Error("first");
        const secondError = new Error("second");
        const failures = await runPool(["a", "b", "c", "d"], 1, (item) => {
            seen.push(item);
            if (item === "b") {
                throw firstError;
            }
            if (item === "d") {
                throw secondError;
            }
        });
        expect(seen).toEqual(["a", "b", "c", "d"]);
        expect(failures).toEqual([{ item: "b", error: firstError }, { item: "d", error: secondError }]);
    });

    it("上限大于任务数时每个任务只执行一次", async () => {
        const seen = [];
        await runPool(["a", "b"], 10, (item) => {
            seen.push(item);
        });
        expect(seen.toSorted()).toEqual(["a", "b"]);
    });

    it("空列表直接返回空失败列表", async () => {
        await expect(runPool([], 2, () => {
            throw new Error("不应被调用");
        })).resolves.toEqual([]);
    });
});
