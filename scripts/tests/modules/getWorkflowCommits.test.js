import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// octokit.js 是「import 即读 yaml 并初始化」的雷模块；factory 里用 getter 动态读取 env，
// 让被测模块在调用时按 GITHUB_EVENT_NAME / GITHUB_ACTIONS 感知运行环境，与真实 octokit.js 的派生逻辑一致。
// 为什么用 getter 而不是重载模块：真实模块的这些导出是 import 时求值一次的常量，但实测 vitest 5
// 的 vi.resetModules() 不重跑 mock factory（mock 实例缓存在 mock registry，与模块图独立），
// 「每场景重新 import」在 mock 体系下不可行。getter 的求值时机差异（访问时 vs import 时）
// 仅在「被测代码于运行中修改这些 env」时才会显现，而被测代码不存在此行为，
// 各用例内 env 保持稳定，故行为与「以该 env 启动的真实进程」等价。
const { listCommitsFn, paginateFn } = vi.hoisted(() => ({ listCommitsFn: vi.fn(), paginateFn: vi.fn() }));

vi.mock("../../modules/octokit.js", () => ({
    get isPush() {
        return process.env.GITHUB_EVENT_NAME === "push";
    },
    get isPullRequest() {
        return process.env.GITHUB_EVENT_NAME === "pull_request";
    },
    get isInGithubActions() {
        return process.env.GITHUB_ACTIONS === "true";
    },
    octokit: {
        paginate: paginateFn,
        rest: {
            pulls: {
                listCommits: listCommitsFn,
            },
        },
    },
    octokitBaseOptions: {
        owner: "TestOwner",
        repo: "TestRepo",
    },
}));

// workflowEvent 依赖 GITHUB_EVENT_PATH 指向磁盘上的真实事件文件，直接替换为可控 mock，
// 每个用例注入不同的事件载荷
const readWorkflowEventFn = vi.hoisted(() => vi.fn());

vi.mock("../../modules/workflowEvent.js", () => ({
    "default": readWorkflowEventFn,
    readWorkflowEvent: readWorkflowEventFn,
}));

import getWorkflowCommits from "../../modules/getWorkflowCommits.js";

let exitSpy;

beforeEach(() => {
    // 「未处理事件」与「空 commit」分支会调用 process.exit(0)，必须拦截以免杀掉测试进程
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined);
});

afterEach(() => {
    exitSpy.mockRestore();
    vi.unstubAllEnvs();
    readWorkflowEventFn.mockReset();
    paginateFn.mockReset();
    listCommitsFn.mockReset();
});

describe("getWorkflowCommits", () => {
    it("push 事件直接返回载荷中的 commit 列表，不调用 API", async () => {
        vi.stubEnv("GITHUB_EVENT_NAME", "push");
        const commits = [
            { id: "sha1", message: "feat: a", url: "https://example.com/1", author: { name: "A", email: "a@example.com" }, committer: null },
            { id: "sha2", message: "fix: b", url: "https://example.com/2", author: null, committer: { name: "B", email: "b@example.com" } },
        ];
        readWorkflowEventFn.mockResolvedValue({ commits });
        await expect(getWorkflowCommits()).resolves.toEqual(commits);
        expect(paginateFn).not.toHaveBeenCalled();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("push 事件载荷缺少 commit 数组时以退出码 0 结束", async () => {
        vi.stubEnv("GITHUB_EVENT_NAME", "push");
        readWorkflowEventFn.mockResolvedValue({});
        await getWorkflowCommits();
        expect(exitSpy).toHaveBeenCalledWith(0);
        expect(paginateFn).not.toHaveBeenCalled();
    });

    it("push 事件载荷 commit 列表为空时以退出码 0 结束", async () => {
        vi.stubEnv("GITHUB_EVENT_NAME", "push");
        readWorkflowEventFn.mockResolvedValue({ commits: [] });
        await getWorkflowCommits();
        expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("pull_request 事件分页拉取 commit 并归一化为统一形状", async () => {
        vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
        // eslint-disable-next-line camelcase -- GitHub API 事件载荷字段为 snake_case
        readWorkflowEventFn.mockResolvedValue({ pull_request: { number: 42 } });
        paginateFn.mockResolvedValue([
            {
                sha: "a1b2c3d",
                // eslint-disable-next-line camelcase -- GitHub API 响应字段为 snake_case
                html_url: "https://github.com/TestOwner/TestRepo/commit/a1b2c3d",
                commit: {
                    message: "feat: something",
                    author: { name: "Alice", email: "alice@example.com" },
                    committer: { name: "Alice", email: "alice@example.com" },
                },
            },
        ]);
        await expect(getWorkflowCommits()).resolves.toEqual([
            {
                id: "a1b2c3d",
                message: "feat: something",
                url: "https://github.com/TestOwner/TestRepo/commit/a1b2c3d",
                author: { name: "Alice", email: "alice@example.com" },
                committer: { name: "Alice", email: "alice@example.com" },
            },
        ]);
        // octokit.paginate 不经过 request 钩子补全 owner/repo，必须显式带上 octokitBaseOptions
        expect(paginateFn).toHaveBeenCalledWith(listCommitsFn, {
            owner: "TestOwner",
            repo: "TestRepo",
            pull_number: 42,
            per_page: 100,
        });
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("pull_request 事件拉不到任何 commit 时以退出码 0 结束", async () => {
        vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
        // eslint-disable-next-line camelcase -- GitHub API 事件载荷字段为 snake_case
        readWorkflowEventFn.mockResolvedValue({ pull_request: { number: 42 } });
        paginateFn.mockResolvedValue([]);
        await getWorkflowCommits();
        expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it("未处理的事件类型打印消息后以退出码 0 结束", async () => {
        vi.stubEnv("GITHUB_EVENT_NAME", "schedule");
        readWorkflowEventFn.mockResolvedValue({});
        await getWorkflowCommits();
        expect(paginateFn).not.toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(0);
    });
});
