/* eslint-disable camelcase -- GitHub 事件 payload 的字段是 snake_case（pull_request 等） */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js。
// octokit.js / workflowEvent.js 均 import 即 I/O，必须整体替换
const octokitMocks = vi.hoisted(() => ({}));
vi.mock("../../modules/octokit.js", () => {
    octokitMocks.requestReviewers = vi.fn(() => ({ data: {} }));
    octokitMocks.addAssignees = vi.fn(() => ({ data: {} }));
    return {
        isInGithubActions: true,
        octokit: {
            rest: {
                pulls: { requestReviewers: octokitMocks.requestReviewers },
                issues: { addAssignees: octokitMocks.addAssignees },
            },
        },
    };
});

const eventState = vi.hoisted(() => ({ event: {} }));
vi.mock("../../modules/workflowEvent.js", () => ({
    "default": () => eventState.event,
    readWorkflowEvent: () => eventState.event,
}));

const configState = vi.hoisted(() => ({
    config: { addReviewers: true, reviewers: ["alice", "bob"], addAssignees: true, assignees: ["carol"] },
}));
// readFile 每次返回深拷贝：脚本会 splice 移除作者本人，不能让用例间的共享配置被改写
vi.mock("../../modules/yamlModule.js", () => ({
    "default": { readFile: () => structuredClone(configState.config) },
}));

// 用抛哨兵异常代替真实退出，使动态 import 以该异常 reject，退出码可从异常上断言
class ExitSentinel extends Error {
    constructor(code) {
        super(`process.exit(${code})`);
        this.exitCode = code;
    }
}

let exitSpy;

beforeEach(() => {
    vi.resetModules();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
        throw new ExitSentinel(code);
    });
});

afterEach(() => {
    exitSpy.mockRestore();
});

const importScript = async () => {
    try {
        await import("../../autoAssign/index.js");
        return null;
    } catch (error) {
        return error;
    }
};

describe("autoAssign", () => {
    it("ready_for_review 触发时为 PR 指派评审与负责人", async () => {
        eventState.event = { action: "ready_for_review", number: 5, pull_request: { draft: false, user: { login: "dave" } } };
        const rejection = await importScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(0);
        expect(octokitMocks.requestReviewers).toHaveBeenCalledWith({ pull_number: 5, reviewers: ["alice", "bob"] });
        expect(octokitMocks.addAssignees).toHaveBeenCalledWith({ issue_number: 5, assignees: ["carol"] });
    });

    it("draft PR 以 opened 触发时跳过，不发起任何指派请求", async () => {
        eventState.event = { action: "opened", number: 5, pull_request: { draft: true, user: { login: "dave" } } };
        const rejection = await importScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(0);
        expect(octokitMocks.requestReviewers).not.toHaveBeenCalled();
        expect(octokitMocks.addAssignees).not.toHaveBeenCalled();
    });

    it("opened 非 draft 照常指派，评审列表会移除作者本人", async () => {
        eventState.event = { action: "opened", number: 7, pull_request: { draft: false, user: { login: "alice" } } };
        const rejection = await importScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(0);
        expect(octokitMocks.requestReviewers).toHaveBeenCalledWith({ pull_number: 7, reviewers: ["bob"] });
    });

    it("其他 action 直接跳过，不发起任何指派请求", async () => {
        eventState.event = { action: "synchronize", number: 9, pull_request: { draft: false, user: { login: "dave" } } };
        const rejection = await importScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(0);
        expect(octokitMocks.requestReviewers).not.toHaveBeenCalled();
        expect(octokitMocks.addAssignees).not.toHaveBeenCalled();
    });
});
