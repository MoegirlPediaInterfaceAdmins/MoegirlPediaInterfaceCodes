import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js。
// attribution / countCommitChanges / mailmap 保持真实——被测行为正是三者的交互
vi.mock("../../modules/octokit.js", () => ({
    isInGithubActions: false,
    isInMasterBranch: true,
    isInMoegirlPediaInterfaceCodes: true,
    debugLoggingEnabled: false,
    debugConsole: { log: vi.fn(), info: vi.fn() },
    octokit: {
        rest: {
            users: {
                // 返回伪造密钥即可：gpg --import 由下面的 child_process mock 拦截
                listGpgKeysForUser: vi.fn(() => Promise.resolve({ data: [{ key_id: "FAKEKEY", raw_key: "FAKE" }] })),
            },
        },
    },
}));

vi.mock("node:child_process", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        // gpg --import 不真正执行，直接回调成功；child_process.execFile 本就是
        // 回调式 API，被测脚本一侧用 promisify 消费
        /* eslint-disable promise/prefer-await-to-callbacks -- 见上 */
        execFile: (_command, _args, _options, callback) => {
            callback(null, { stdout: "", stderr: "" });
        },
        /* eslint-enable promise/prefer-await-to-callbacks */
    };
});

const gitState = vi.hoisted(() => ({ commits: [] }));
vi.mock("../../modules/git.js", () => ({
    "default": {
        log: vi.fn(() => Promise.resolve({ all: gitState.commits })),
        raw: vi.fn(),
        env: vi.fn(),
    },
}));

vi.mock("../../modules/mkdtmp.js", () => ({
    "default": () => Promise.resolve("/tmp/mgp-fake"),
}));

vi.mock("node:fs", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        "default": {
            ...actual,
            promises: {
                ...actual.promises,
                chmod: vi.fn(() => Promise.resolve()),
                writeFile: vi.fn(() => Promise.resolve()),
                stat: vi.fn(() => Promise.resolve({})),
            },
        },
    };
});

const jsonState = vi.hoisted(() => ({ writeCalls: [] }));
vi.mock("../../modules/jsonModule.js", () => ({
    "default": {
        writeFile: vi.fn((...args) => {
            jsonState.writeCalls.push(args);
            return Promise.resolve();
        }),
    },
}));

vi.mock("../../modules/createCommit.js", () => ({
    "default": vi.fn(() => Promise.resolve()),
}));

vi.mock("../../modules/yamlModule.js", () => ({
    "default": {
        // bots.yaml 顶层就是数组
        readFile: () => Promise.resolve([]),
    },
}));

// 邮箱选用 mailmap 必然没有的 example.com，使主作者与 co-author 都走 GH: 路径；
// 两者显示名相同即解析出同一用户名——这正是「同一人双计」的最小复现
const selfCoAuthorCommit = {
    hash: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    _date: "2026-01-02T03:04:05+00:00",
    authorName: "AnnAngela",
    _authorEmail: "author@example.com",
    committerName: "AnnAngela",
    _committerEmail: "committer@example.com",
    _signatureKey: "",
    _signatureStatus: "N",
    _signatureSigner: "",
    parents: "",
    coAuthors: "Co-authored-by: AnnAngela <coauthor@example.com>\n",
    diff: { files: [{ file: "src/global/zh/a.js", changes: 3 }] },
};

beforeEach(() => {
    vi.resetModules();
    gitState.commits = [structuredClone(selfCoAuthorCommit)];
});

afterEach(() => {
    jsonState.writeCalls = [];
});

const importScript = async () => {
    try {
        await import("../../generateCommitsHistory/index.js");
        return null;
    } catch (error) {
        return error;
    }
};

const lastHistoryWrite = () => {
    const [target, history] = jsonState.writeCalls.at(-1);
    expect(target).toBe("src/global/zh/GHIAHistory.json");
    return history;
};

describe("generateCommitsHistory 归属去重", () => {
    it("提交者与 co-author 解析为同一用户名时，同一提交只计一次", async () => {
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const history = lastHistoryWrite();
        expect(history["GH:AnnAngela"]).toHaveLength(1);
        expect(history["GH:AnnAngela"][0]).toMatchObject({
            commit: selfCoAuthorCommit.hash,
            changedFiles: 1,
        });
    });

    it("去重键是用户名+提交哈希：同一用户的不同提交仍分别记录", async () => {
        gitState.commits = [
            structuredClone(selfCoAuthorCommit),
            { ...structuredClone(selfCoAuthorCommit), hash: "ffffffffffffffffffffffffffffffffffffffff", coAuthors: "" },
        ];
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const history = lastHistoryWrite();
        expect(history["GH:AnnAngela"]).toHaveLength(2);
    });

    it("不同用户各自记录，互不影响", async () => {
        gitState.commits = [{
            ...structuredClone(selfCoAuthorCommit),
            coAuthors: "Co-authored-by: Bob <bob@example.com>\n",
        }];
        const rejection = await importScript();
        expect(rejection).toBeNull();
        const history = lastHistoryWrite();
        expect(history["GH:AnnAngela"]).toHaveLength(1);
        expect(history["GH:Bob"]).toHaveLength(1);
    });
});
