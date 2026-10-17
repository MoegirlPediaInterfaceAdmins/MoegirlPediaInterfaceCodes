// XMLHttpRequest 的可编程 mock：Downloader 域（裸 XHR 下载器）测试的地基。
// installXhr(responder) 以 vi.stubGlobal 替换构造器（unstubGlobals 自动清理），
// responder 按 URL/方法路由返回 { status, responseText, delay? }。
// jsdom 自带的真 XHR 被运行时遮蔽，不发出任何网络请求。
import { vi } from "vitest";

export interface MockXhrRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
}

export interface MockXhrResponse {
    status: number;
    responseText: string;
    /** 响应头（getLastModifiedDate 等用例断言 Last-Modified） */
    headers?: Record<string, string>;
    /** 延迟（ms）后才进入 readyState 4，供中止/竞态用例控制时序 */
    delay?: number;
}

export type XhrResponder = (request: MockXhrRequest) => MockXhrResponse | Promise<MockXhrResponse>;

export interface InstalledXhr {
    /** 已 send 的请求（含 header 面，供断言 Api-User-Agent 等） */
    sent: MockXhrRequest[];
    /** 尚未响应的挂起请求句柄（delay 响应前的 abort 竞态由 abort 标志位处理） */
    instances: MockXmlHttpRequest[];
}

// Downloader 用到的最小 XHR 面：open/setRequestHeader/send/abort +
// onreadystatechange/readyState/status/responseText
export class MockXmlHttpRequest {
    onreadystatechange: (() => void) | null = null;
    readyState = 0;
    status = 0;
    responseText = "";
    aborted = false;
    request: MockXhrRequest | null = null;
    private responseHeaders: Record<string, string> = {};

    open(method: string, url: string): void {
        this.request = { method, url, headers: {} };
        this.readyState = 1;
    }

    getResponseHeader(name: string): string | null {
        return this.responseHeaders[name] ?? null;
    }

    setRequestHeader(name: string, value: string): void {
        if (!this.request) {
            throw new Error("setRequestHeader called before open");
        }
        this.request.headers[name] = value;
    }

    abort(): void {
        this.aborted = true;
    }

    send(): void {
        if (!this.request) {
            throw new Error("send called before open");
        }
        const request = this.request;
        // 真 XHR 的 readystatechange 在状态变化时触发（1/2/3/4），此处先以
        // 非完成态同步触发一次，覆盖调用方的 readyState===4 早退判定
        this.onreadystatechange?.();
        void (async () => {
            const response = await respondRef.current(request);
            if (response.delay) {
                await new Promise((resolve) => {
                    setTimeout(resolve, response.delay);
                });
            }
            // abort 后不再推进状态（与真 XHR 一致：回调不再触发）
            if (this.aborted) {
                return;
            }
            this.status = response.status;
            this.responseText = response.responseText;
            this.responseHeaders = response.headers ?? {};
            this.readyState = 4;
            this.onreadystatechange?.();
        })();
    }
}

// 模块级响应器引用：类定义在 install 之外也保持单例语义（测试文件内仅一次 install）
const respondRef: { current: XhrResponder } = {
    current: () => {
        throw new Error("installXhr not called yet");
    },
};

export const installXhr = (respond: XhrResponder): InstalledXhr => {
    respondRef.current = respond;
    const sent: MockXhrRequest[] = [];
    const instances: MockXmlHttpRequest[] = [];

    class RoutedXmlHttpRequest extends MockXmlHttpRequest {
        override send(): void {
            instances.push(this);
            if (this.request) {
                sent.push(this.request);
            }
            super.send();
        }
    }

    vi.stubGlobal("XMLHttpRequest", RoutedXmlHttpRequest);
    return { sent, instances };
};
