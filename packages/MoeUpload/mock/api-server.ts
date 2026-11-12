// 模拟 MediaWiki Action API：拦截联想 widget 的 fetch 查询，主流程与上传经假 mw.Api 直连 handle()。
// 彩蛋：文件名含 警告/warn → warnings；失败/fail → 服务器错误；审核/queue → moderation-image-queued。
// stash 校验与 finalize 按真实 API 模拟；响应类型刻意宽松（Record<string, unknown>），契约类型只用在 src 侧。

type ApiParams = Record<string, string>;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface MockFile {
    title: string;
    sha1: string;
    size: number;
}

const SEEDED_FILES: MockFile[] = [
    {
        title: "File:已存在的图片.png",
        sha1: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        size: 123456,
    },
    { title: "File:重复内容.jpg", sha1: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", size: 42000 },
];

const CATEGORY_SEEDS = ["图像素材", "图像截图", "动画截图", "游戏截图", "人物图像"];

interface Stash {
    received: number;
    total: number;
    // 暂存时的目标文件名（finalize 时校验用）
    name?: string;
}

const stashes = new Map<string, Stash>();
let stashSeq = 0;

const isApiUrl = (url: string): boolean => url.includes("api.php");

const bodyToParams = async (body: unknown): Promise<ApiParams> => {
    const params: ApiParams = {};
    if (typeof body === "string") {
        return Object.fromEntries(new URLSearchParams(body));
    }
    if (body instanceof URLSearchParams) {
        return Object.fromEntries(body);
    }
    return params;
};

const blobSize = (marker: string | undefined): number => {
    if (!marker?.startsWith("__blob__:")) {
        return 0;
    }
    const size = Number(marker.split(":")[2]);
    return Number.isFinite(size) ? size : 0;
};

// __blob__:<名称>:<字节数> 占位串：假 mw.Api 把二进制参数转成它，handleUpload 经 blobSize 读回大小。
const blobMarker = (value: Blob): string => {
    const name = value instanceof File ? value.name : "blob";
    // 文件名可能含冒号（macOS/Linux 合法），会破坏 __blob__:name:size 的分段约定
    return `__blob__:${name.replace(/:/g, "_")}:${value.size}`;
};

const relativeTitle = (fullTitle: string): string => fullTitle.replace(/^File:/, "");

const handle = async (params: ApiParams): Promise<Record<string, unknown>> => {
    await sleep(120 + Math.random() * 180);

    const action = params.action ?? "";
    const meta = params.meta ?? "";

    if (action === "query" && meta.includes("tokens")) {
        return { query: { tokens: { csrftoken: "MOCK_CSRF_TOKEN" } } };
    }

    if (action === "query" && meta.includes("siteinfo") && meta.includes("userinfo")) {
        return {
            query: {
                general: {
                    maxuploadsize: 20 * 1024 * 1024,
                    minuploadchunksize: 1024,
                },
                userinfo: {
                    name: "MockUser",
                    rights: ["autoconfirmed", "upload", "upload_by_url", "reupload", "writeapi"],
                },
            },
        };
    }

    if (action === "query" && params.list === "allcategories") {
        const prefix = (params.acprefix ?? "").trim();
        const hits = CATEGORY_SEEDS.filter((name) => name.startsWith(prefix)).slice(0, 10);
        return { query: { allcategories: hits.map((name) => ({ category: name })) } };
    }

    if (action === "query" && params.generator === "prefixsearch") {
        const query = (params.gpssearch ?? "").trim();
        // ns 14 = Category 联想（作品名字段），ns 6 = 文件名联想（带缩略图占位）
        if (params.gpsnamespace === "14") {
            const categoryHits = CATEGORY_SEEDS.filter((name) => name.startsWith(query)).slice(0, 10);
            return {
                query: {
                    pages: categoryHits.map((name, index) => ({
                        title: `Category:${name}`,
                        index,
                    })),
                },
            };
        }
        const hits = SEEDED_FILES.filter((file) => relativeTitle(file.title).startsWith(query)).slice(
            0,
            10,
        );
        return {
            query: {
                pages: hits.map((file, index) => ({
                    title: file.title,
                    index,
                    imageinfo: [{ thumburl: "", thumbwidth: 60, thumbheight: 60 }],
                })),
            },
        };
    }

    if (action === "upload") {
        return handleUpload(params);
    }

    return { batchcomplete: true, query: {} };
};

const apiErrorFrom = (code: string, info: string): Record<string, unknown> => ({
    error: { code, info },
});

// 分块响应：仅 Continue 带 offset；最后一块拼接完成后换发新暂存 key 并删除旧 key（与真实 API 一致）。
const chunkResponse = (
    filekey: string,
    received: number,
    total: number,
    filename: string,
): Record<string, unknown> => {
    if (received < total) {
        return { upload: { result: "Continue", filekey, offset: received } };
    }
    stashes.delete(filekey);
    const assembled = `mockassembled-${++stashSeq}`;
    stashes.set(assembled, { received: total, total, name: filename });
    return { upload: { result: "Success", filekey: assembled } };
};

const handleUpload = async (params: ApiParams): Promise<Record<string, unknown>> => {
    const filename = params.filename;
    const isStash = params.stash === "1";
    const chunkSize = blobSize(params.chunk);
    const hasChunk = params.chunk !== undefined;

    // 内容源三选一：非 chunk 请求必须恰好提供 filekey / file / url 之一，全缺即 missingparam
    if (!hasChunk && !params.filekey && params.file === undefined && !params.url) {
        return apiErrorFrom("missingparam", "filekey、file 与 url 必须提供其中一个");
    }
    // filename 在所有上传请求上都是硬性要求（缺失即 missingparam）
    if (filename === undefined) {
        return apiErrorFrom("missingparam", "未提供 filename 参数");
    }

    if (hasChunk) {
        // filesize 每一块都会被服务端读取（与 offset 累计值比较），缺失即 invalid-chunk
        if (params.filesize === undefined) {
            return apiErrorFrom("invalid-chunk", "分块请求缺少 filesize");
        }
        const total = Number(params.filesize);
        const offset = params.offset === undefined ? Number.NaN : Number(params.offset);

        if (!params.filekey) {
            // 首块：offset 必须显式为 0（服务端用严格 !== 0 判断）
            if (offset !== 0) {
                return apiErrorFrom("filekeyneeded", "首块分块请求必须带 offset=0");
            }
            const filekey = `mockstash-${++stashSeq}`;
            stashes.set(filekey, { received: chunkSize, total, name: filename });
            return chunkResponse(filekey, chunkSize, total, filename);
        }

        // 续传块：必须同时带 filename / filesize / offset
        const stash = stashes.get(params.filekey);
        if (!stash) {
            return apiErrorFrom("stashnosuchfilekey", "暂存文件不存在或已过期");
        }
        if (offset !== stash.received) {
            return apiErrorFrom("stashfailed", `分块偏移不匹配（服务端已接收 ${stash.received}）`);
        }
        stash.received += chunkSize;
        if (stash.received > stash.total) {
            return apiErrorFrom("invalid-chunk", "分块累计长度超过 filesize");
        }
        return chunkResponse(params.filekey, stash.received, stash.total, filename);
    }

    if (isStash && params.url) {
        const filekey = `mockurl-${++stashSeq}`;
        stashes.set(filekey, { received: 0, total: 0, name: filename });
        await sleep(500);
        if (/(失败|fail)/i.test(filename)) {
            return apiError();
        }
        return { upload: { result: "Success", filekey, sessionkey: filekey } };
    }

    if (isStash) {
        const size = blobSize(params.file);
        const filekey = `mockstash-${++stashSeq}`;
        stashes.set(filekey, { received: size, total: size, name: filename });
        return { upload: { result: "Success", filekey, sessionkey: filekey } };
    }

    // 最终提交：filekey 必须仍在暂存表里（过期/不存在即 stashnosuchfilekey）
    if (params.filekey && !stashes.has(params.filekey)) {
        return apiErrorFrom("stashnosuchfilekey", "暂存文件不存在或已过期");
    }
    if (/(失败|fail)/i.test(filename)) {
        return apiError();
    }
    if (/(审核|queue)/i.test(filename)) {
        return { error: { code: "moderation-image-queued", info: "模拟：文件已进入审核队列" } };
    }
    if (/(警告|warn)/i.test(filename) && params.ignorewarnings !== "1") {
        // warnings 形态：exists 系拍平成「键=子类型、值=文件名」，duplicate 是文件名字符串数组；警告不消费暂存，改名重试/覆盖上传复用同一 filekey。
        return {
            upload: {
                result: "Warning",
                warnings: {
                    exists: "已存在的图片.png",
                    duplicate: ["重复内容.jpg"],
                },
            },
        };
    }
    if (params.filekey) {
        stashes.delete(params.filekey);
    }
    return {
        upload: {
            result: "Success",
            // upload.filename 不含命名空间前缀（与真实 API 一致）
            filename: filename.replace(/^File:/, ""),
            imageinfo: { descriptionurl: `/${encodeURIComponent(`File:${filename}`)}` },
        },
    };
};

const apiError = (): Record<string, unknown> => ({
    error: { code: "internal_api_error_MockError", info: "模拟的服务器错误" },
});

const installFetchMock = (): void => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url
            = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (!isApiUrl(url) || !init?.body) {
            return realFetch(input, init);
        }
        const params = await bodyToParams(init.body);
        const json = await handle(params);
        return new Response(JSON.stringify(json), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    };
};

const installMockApi = (): void => {
    installFetchMock();
};

export { blobMarker, handle, installMockApi };
