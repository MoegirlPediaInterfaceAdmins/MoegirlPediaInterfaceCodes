import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// octokit.js 模块级就会完成鉴权与实例化，mock 掉 @octokit/rest 以拦截 paginate 调用参数；
// 其余依赖（yamlModule 读 .github/auto_assign.yaml 等）保持真实。雷模块处理惯例见
// createCommit.test.js
const octokitMocks = vi.hoisted(() => ({}));
vi.mock("@octokit/rest", () => {
    class Octokit {
        constructor() {
            this.rest = {
                issues: {
                    listForRepo: vi.fn(),
                    create: vi.fn(() => Promise.resolve({ data: { number: 42 } })),
                    update: vi.fn(() => Promise.resolve({ data: {} })),
                    createComment: vi.fn(() => Promise.resolve({ data: {} })),
                },
            };
            this.hook = { wrap: vi.fn() };
            this.paginate = vi.fn(() => Promise.resolve([]));
            this.auth = vi.fn(() => Promise.resolve({}));
            octokitMocks.instance = this;
        }

        static plugin = () => Octokit;
    }
    return { Octokit };
});

beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("GITHUB_REPOSITORY_OWNER", "MoegirlPediaInterfaceAdmins");
    vi.stubEnv("GITHUB_REPOSITORY", "MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes");
    vi.stubEnv("GITHUB_REF", "refs/heads/master");
    vi.stubEnv("GITHUB_RUN_ID", "123");
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("octokit/createIssue", () => {
    it("paginate 显式携带 owner/repo（paginate 内部先归一化 URL，request 钩子补不上）", async () => {
        const { createIssue } = await import("../../modules/octokit.js");
        await createIssue("Some title", "Some body", ["ci:some-label"]);
        expect(octokitMocks.instance.paginate).toHaveBeenCalledOnce();
        const paginateOptions = octokitMocks.instance.paginate.mock.calls[0][1];
        expect(paginateOptions).toEqual(expect.objectContaining({
            owner: "MoegirlPediaInterfaceAdmins",
            repo: "MoegirlPediaInterfaceCodes",
            labels: "ci:some-label",
            per_page: 100,
        }));
    });

    it("查无已有 issue 时创建新 issue 并回复", async () => {
        const { createIssue } = await import("../../modules/octokit.js");
        const issueNumber = await createIssue("Some title", "Some body", ["ci:some-label"]);
        expect(octokitMocks.instance.rest.issues.create).toHaveBeenCalledWith(expect.objectContaining({
            title: "Some title",
            body: "Some body",
            labels: ["ci:some-label"],
        }));
        expect(octokitMocks.instance.rest.issues.createComment).toHaveBeenCalledWith(expect.objectContaining({
            issue_number: 42,
        }));
        expect(issueNumber).toBe(42);
    });
});
