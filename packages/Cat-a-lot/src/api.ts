import { API_TIMEOUT_MS } from "./constants.ts";
import { normalizeCatName } from "./wikitext.ts";
import type { ApiClient, CategoryTree, EditPageParams, PageWikitext } from "./types.ts";

interface ApiErrorPayload {
    code?: string;
    info?: string;
}

interface CatALotApiError extends Error {
    error?: ApiErrorPayload;
}

interface TrackedRequest {
    then(onFulfilled: (value: unknown) => void, onRejected: (...args: unknown[]) => void): unknown;
    abort(): void;
}

interface ParentCategoriesResponse {
    query?: {
        pages?: readonly {
            missing?: unknown;
            categories?: readonly { title?: string | undefined }[];
        }[];
    };
}

interface SubcategoriesResponse {
    query?: {
        categorymembers?: readonly { title?: string | undefined }[];
    };
}

interface RevisionsResponse {
    curtimestamp?: string;
    query?: {
        pages?: readonly {
            missing?: unknown;
            invalid?: unknown;
            revisions?: readonly {
                timestamp?: string | undefined;
                slots?: { main?: { content?: string | undefined } };
            }[];
        }[];
    };
}

interface EditResponse {
    edit?: {
        result?: string;
        code?: string;
        info?: string;
    };
}

const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === "object"
    && value !== null
    ? value as Record<string, unknown>
    : null;

const asArray = (value: unknown): readonly unknown[] => {
    if (!Array.isArray(value)) {
        return [];
    }
    const items: readonly unknown[] = value;
    return items;
};

const stringValue = (value: unknown): string => typeof value === "string" ? value : "";

const readErrorPayload = (value: unknown): ApiErrorPayload => {
    const payload: ApiErrorPayload = {};
    const record = asRecord(value);
    if (!record) {
        return payload;
    }
    const error = asRecord(record.error) ?? asRecord(asArray(record.errors)[0]);
    if (!error) {
        return payload;
    }
    const code = stringValue(error.code);
    const info = stringValue(error.info);
    if (code) {
        payload.code = code;
    }
    if (info) {
        payload.info = info;
    }
    return payload;
};

/** 把 mw.Api 的多参 reject 转成 Error；只有业务错误带 error.code，供批处理区分网络错误。 */
const toApiError = (args: readonly unknown[]): Error => {
    const codeArg = args[0];
    const resultArg = args[1];
    const payload = readErrorPayload(resultArg);
    const code = payload.code ?? (typeof codeArg === "string" ? codeArg : "unknown");
    const transport = asRecord(resultArg);
    const textStatus = transport ? stringValue(transport.textStatus) : "";
    const exception = transport ? stringValue(transport.exception) : "";
    const resultText = typeof resultArg === "string" ? resultArg : "";
    const message = payload.info ?? (exception || textStatus || resultText || code);
    const error = new Error(message) as CatALotApiError;
    if (payload.code !== undefined || payload.info !== undefined) {
        error.error = payload;
    }
    return error;
};

const createBusinessError = (code: string, info: string): Error => {
    const error = new Error(info || code) as CatALotApiError;
    error.error = { code, info };
    return error;
};

const categoryNames = (items: readonly { title?: string | undefined }[] | undefined): string[] => (items ?? [])
    .map((item) => typeof item.title === "string" ? normalizeCatName(item.title) : "")
    .filter((name) => name !== "");

const createApi = (userName: string): ApiClient => {
    let client: mw.Api | null = null;
    let active: TrackedRequest | null = null;

    const getApi = (): mw.Api => {
        client ??= new mw.Api();
        return client;
    };

    const clearActive = (request: TrackedRequest): void => {
        if (active === request) {
            active = null;
        }
    };

    const request = <T>(promise: mw.Api.AbortablePromise, trackAbort = true): Promise<T> => {
        const tracked = promise as unknown as TrackedRequest;
        if (trackAbort) {
            active = tracked;
        }
        return new Promise<T>((resolve, reject) => {
            // eslint-disable-next-line promise/prefer-await-to-then, promise/prefer-catch, promise/catch-or-return -- mw.Api 以 (code, result, ...) 多参 reject，await 只能拿到 code，会丢掉 error.info
            tracked.then(
                (value) => {
                    if (trackAbort) {
                        clearActive(tracked);
                    }
                    resolve(value as T);
                    return;
                },
                (...args) => {
                    if (trackAbort) {
                        clearActive(tracked);
                    }
                    reject(toApiError(args));
                    return;
                },
            );
        });
    };

    const fetchCategoryTree = async (
        catName: string,
        subcatLimit: number,
        allowCategoryMembers: boolean,
    ): Promise<CategoryTree> => {
        const clean = normalizeCatName(catName);
        const fullTitle = `Category:${clean}`;
        const parentRequest = request<ParentCategoriesResponse>(getApi().post({
            action: "query",
            prop: "categories",
            titles: fullTitle,
            cllimit: "max",
            clshow: "!hidden",
            formatversion: 2,
        }, { timeout: API_TIMEOUT_MS }), false);
        const subRequest = allowCategoryMembers
            ? request<SubcategoriesResponse>(getApi().post({
                action: "query",
                list: "categorymembers",
                cmtitle: fullTitle,
                cmtype: "subcat",
                cmlimit: clampSubcatLimit(subcatLimit),
                formatversion: 2,
            }, { timeout: API_TIMEOUT_MS }), false)
            : Promise.resolve(null);

        const [parentResponse, subResponse] = await Promise.all([parentRequest, subRequest]);
        const page = parentResponse.query?.pages?.[0];
        return {
            missing: !page || Boolean(page.missing),
            parents: categoryNames(page?.categories),
            subs: categoryNames(subResponse?.query?.categorymembers),
        };
    };

    const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
        const clean = normalizeCatName(query);
        if (!clean) {
            return [];
        }
        const response = await request<unknown>(getApi().post({
            action: "opensearch",
            namespace: 14,
            search: clean,
            limit: 12,
            format: "json",
        }, { timeout: API_TIMEOUT_MS }), false);
        return asArray(asArray(response)[1])
            .filter((item): item is string => typeof item === "string")
            .map((title) => normalizeCatName(title))
            .filter((title) => title !== "");
    };

    const fetchPageWikitext = async (title: string): Promise<PageWikitext> => {
        const response = await request<RevisionsResponse>(getApi().post({
            action: "query",
            prop: "revisions",
            titles: title,
            rvprop: "content|timestamp",
            rvslots: "main",
            curtimestamp: 1,
            formatversion: 2,
        }, { timeout: API_TIMEOUT_MS }));
        const page = response.query?.pages?.[0];
        const revision = page?.revisions?.[0];
        return {
            content: revision?.slots?.main?.content,
            timestamp: revision?.timestamp,
            curtimestamp: response.curtimestamp,
            missing: !page || Boolean(page.missing),
            invalid: Boolean(page?.invalid),
        };
    };

    const editPage = async (params: EditPageParams): Promise<void> => {
        const payload: Record<string, string | number | boolean> = {
            action: "edit",
            title: params.title,
            text: params.text,
            summary: params.summary,
            watchlist: params.watchlist,
            nocreate: true,
            tags: params.tags,
            formatversion: 2,
        };
        if (params.minor) {
            payload.minor = true;
        }
        if (params.bot) {
            payload.bot = true;
        }
        if (typeof params.basetimestamp === "string" && params.basetimestamp !== "") {
            payload.basetimestamp = params.basetimestamp;
        }
        if (typeof params.starttimestamp === "string" && params.starttimestamp !== "") {
            payload.starttimestamp = params.starttimestamp;
        }
        const response = await request<EditResponse>(getApi().postWithToken("csrf", payload, {
            timeout: API_TIMEOUT_MS,
        }));
        const edit = response.edit;
        if (edit?.result !== "Success") {
            throw createBusinessError(edit?.code ?? "edit-failed", edit?.info ?? "");
        }
    };

    const grantFlood = async (tags: string, user: string): Promise<void> => {
        await request<unknown>(getApi().postWithToken("userrights", {
            action: "userrights",
            user: user || userName,
            add: "flood",
            expiry: "2 hours",
            // 理由写入权限日志，固定使用简体，不随界面语言变体转换。
            reason: "[[Help:Cat-a-lot|Cat-a-lot]]：临时启用机器用户",
            tags,
            formatversion: 2,
        }, { timeout: API_TIMEOUT_MS }));
    };

    const revokeFlood = async (tags: string, user: string): Promise<void> => {
        await request<unknown>(getApi().postWithToken("userrights", {
            action: "userrights",
            user: user || userName,
            remove: "flood",
            reason: "[[Help:Cat-a-lot|Cat-a-lot]]：批量分类完成，移除临时机器用户",
            tags,
            formatversion: 2,
        }, { timeout: API_TIMEOUT_MS }));
    };

    const abortActive = (): void => {
        const current = active;
        active = null;
        if (current) {
            current.abort();
        }
    };

    return {
        fetchCategoryTree,
        fetchCategorySuggestions,
        fetchPageWikitext,
        editPage,
        grantFlood,
        revokeFlood,
        abortActive,
    };
};

const clampSubcatLimit = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 50;
    }
    return Math.min(Math.max(Math.trunc(value), 1), 500);
};

export type {
    CatALotApiError,
};
export { createApi };
