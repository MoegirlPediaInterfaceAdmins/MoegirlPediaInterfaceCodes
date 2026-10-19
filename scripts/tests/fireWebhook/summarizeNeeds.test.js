import { describe, expect, it } from "vitest";
import summarizeNeeds from "../../fireWebhook/summarizeNeeds.js";

describe("summarizeNeeds", () => {
    it("空 needs 返回全成功的初始汇总", () => {
        expect(summarizeNeeds({})).toEqual({ exitResult: null, success: true, failedJobs: [] });
    });

    it("全部成功时汇总为成功且无失败项", () => {
        const needs = {
            build: { result: "success" },
            lint: { result: "success" },
        };
        expect(summarizeNeeds(needs)).toEqual({ exitResult: null, success: true, failedJobs: [] });
    });

    it("failure 记入 failedJobs 且 success 置为 false", () => {
        const needs = {
            build: { result: "success" },
            lint: { result: "failure" },
        };
        expect(summarizeNeeds(needs)).toEqual({ exitResult: null, success: false, failedJobs: ["lint"] });
    });

    it("多个 failure 全部收集", () => {
        const needs = {
            build: { result: "failure" },
            lint: { result: "failure" },
            test: { result: "success" },
        };
        expect(summarizeNeeds(needs)).toEqual({ exitResult: null, success: false, failedJobs: ["build", "lint"] });
    });

    it("failure 之后的 success 不改变已失败的汇总", () => {
        const needs = {
            lint: { result: "failure" },
            build: { result: "success" },
        };
        expect(summarizeNeeds(needs)).toEqual({ exitResult: null, success: false, failedJobs: ["lint"] });
    });

    it("遇到 skipped 短路返回且不再处理后续 job", () => {
        const needs = {
            build: { result: "skipped" },
            lint: { result: "failure" },
        };
        expect(summarizeNeeds(needs)).toEqual({ exitResult: "skipped", success: true, failedJobs: [] });
    });

    it("遇到 cancelled 短路返回且不再处理后续 job", () => {
        const needs = {
            lint: { result: "failure" },
            build: { result: "cancelled" },
            test: { result: "failure" },
        };
        expect(summarizeNeeds(needs)).toEqual({ exitResult: "cancelled", success: false, failedJobs: ["lint"] });
    });

    it("其他结果值（如非枚举字符串）不改变汇总", () => {
        const needs = {
            build: { result: "success" },
            unknown: { result: "whatever" },
        };
        expect(summarizeNeeds(needs)).toEqual({ exitResult: null, success: true, failedJobs: [] });
    });
});
