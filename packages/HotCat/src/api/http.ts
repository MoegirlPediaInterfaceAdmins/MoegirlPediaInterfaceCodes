/** GET 并等待 JSON 响应。 */
const getJson = async <T>(url: string): Promise<T> => await $.getJSON(url) as T;

/** GET 并以回调方式消费 JSON。 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- 调用方按接口形状收窄
const getJsonCallback = <T>(url: string, callback: (data: T) => void): void => {
    void $.getJSON(url, callback as (data: unknown) => void);
};

interface AjaxCallbacks<T> {
    success: (data: T) => void;
    error: (request: JQuery.jqXHR | undefined) => void;
    complete: () => void;
}

/** 带 success / error / complete 的 GET JSON。 */
const ajaxGetJson = <T>(url: string, callbacks: AjaxCallbacks<T>): void => {
    void $.ajax({
        url: url,
        method: "GET",
        dataType: "json",
        success: callbacks.success as (data: unknown) => void,
        error: callbacks.error,
        complete: callbacks.complete,
    });
};

export { getJson, getJsonCallback, ajaxGetJson };
export type { AjaxCallbacks };
