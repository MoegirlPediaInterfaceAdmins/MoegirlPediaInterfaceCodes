const hookEventName = "PreToolUse";

/**
 * 构造 ZCode PreToolUse 钩子的协议输出对象。
 * 仅 continueFlag 为 false 时携带 stopReason（缺省为 "No reason provided"）；
 * systemMessage 可选。
 * @param {{ continueFlag: boolean; stopReason?: string; additionalContext: string; systemMessage?: string; }} params
 * @returns {{ "continue": boolean; hookSpecificOutput: { hookEventName: string; additionalContext: string; }; stopReason?: string; systemMessage?: string; }}
 */
export default ({ continueFlag, stopReason, additionalContext, systemMessage }) => {
    const output = {
        "continue": continueFlag,
        hookSpecificOutput: {
            hookEventName,
            additionalContext,
        },
    };
    if (continueFlag === false) {
        output.stopReason = stopReason || "No reason provided";
    }

    if (systemMessage) {
        output.systemMessage = systemMessage;
    }

    return output;
};
