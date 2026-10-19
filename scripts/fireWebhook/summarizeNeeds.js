import console from "../modules/console.js";

/**
 * 汇总 GHA `needs` 上下文里各 job 的执行结果：按枚举顺序逐个打印 job 结果，
 * 遇到 skipped / cancelled 即短路返回（调用方据此退出，后续 job 不再打印，
 * 与原内联实现的输出顺序一致）；failure 收集进 failedJobs。
 * @param {{ [job: string]: { result: string; } }} needs
 * @returns {{ exitResult: string | null; success: boolean; failedJobs: string[]; }}
 */
export default (needs) => {
    const exitResultList = ["skipped", "cancelled"];
    const summary = {
        exitResult: null,
        success: true,
        failedJobs: [],
    };
    for (const [job, { result }] of Object.entries(needs)) {
        console.info("Job", job, ":", result);
        if (exitResultList.includes(result)) {
            summary.exitResult = result;
            return summary;
        }
        if (result === "failure") {
            summary.success = false;
            summary.failedJobs.push(job);
        }
    }
    return summary;
};
