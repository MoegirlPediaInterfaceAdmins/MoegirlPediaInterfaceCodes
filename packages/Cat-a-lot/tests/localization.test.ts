import { describe, expect, it } from "vitest";
import { formatApiError, notifyText } from "../src/localization.ts";
import { installMw } from "./helpers/mw.ts";

describe("localization", () => {
    it("notifyText 用文本节点承载内容", () => {
        const { mw } = installMw();
        notifyText("<b>错误</b>", "warn");
        expect(mw.notify).toHaveBeenCalledTimes(1);
        const [node, options] = mw.notify.mock.calls[0] as [HTMLElement, { type: string }];
        expect(node).toBeInstanceOf(HTMLElement);
        expect(node.textContent).toBe("<b>错误</b>");
        expect(options).toEqual({ type: "warn" });
    });

    it("formatApiError 提取常见错误形状", () => {
        expect(formatApiError("boom")).toBe("boom");
        expect(formatApiError(new Error("failed"))).toBe("failed");
        expect(formatApiError({ error: { info: "info", code: "code" } })).toBe("info");
        expect(formatApiError({ error: { code: "code" } })).toBe("code");
        expect(formatApiError({ message: "message" })).toBe("message");
        expect(formatApiError(null)).toBeTypeOf("string");
    });
});
