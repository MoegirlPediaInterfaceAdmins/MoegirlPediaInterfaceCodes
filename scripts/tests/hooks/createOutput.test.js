import { describe, expect, it } from "vitest";
import createOutput from "../../hooks/createOutput.js";

describe("createOutput", () => {
    it("continue 为 true 时返回基础输出且不携带 stopReason 与 systemMessage", () => {
        const output = createOutput({ continueFlag: true, additionalContext: "ctx" });
        expect(output).toEqual({
            "continue": true,
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                additionalContext: "ctx",
            },
        });
        expect(output).not.toHaveProperty("stopReason");
        expect(output).not.toHaveProperty("systemMessage");
    });

    it("continue 为 false 且提供 stopReason 时原样携带", () => {
        const output = createOutput({ continueFlag: false, stopReason: "Blocked by hook", additionalContext: "ctx" });
        expect(output).toEqual({
            "continue": false,
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                additionalContext: "ctx",
            },
            stopReason: "Blocked by hook",
        });
    });

    it("continue 为 false 且未提供 stopReason 时使用默认值", () => {
        const output = createOutput({ continueFlag: false, additionalContext: "ctx" });
        expect(output.stopReason).toBe("No reason provided");
    });

    it("stopReason 为空字符串时回退默认值（|| 语义）", () => {
        const output = createOutput({ continueFlag: false, stopReason: "", additionalContext: "ctx" });
        expect(output.stopReason).toBe("No reason provided");
    });

    it("continue 为 true 时即使传入 stopReason 也不携带", () => {
        const output = createOutput({ continueFlag: true, stopReason: "should be ignored", additionalContext: "ctx" });
        expect(output).not.toHaveProperty("stopReason");
    });

    it("systemMessage 提供时携带", () => {
        const output = createOutput({ continueFlag: true, additionalContext: "ctx", systemMessage: "note" });
        expect(output.systemMessage).toBe("note");
    });

    it("systemMessage 为空字符串时不携带", () => {
        const output = createOutput({ continueFlag: true, additionalContext: "ctx", systemMessage: "" });
        expect(output).not.toHaveProperty("systemMessage");
    });
});
