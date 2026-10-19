import console from "../modules/console.js";

/**
 * 按 `.` 分隔的点路径从对象取值，如 ("commit.author.name", obj)。
 * @param {any} object
 * @param {string} camelCaseName
 */
export const getPropertyFromCamelCase = (object, camelCaseName) => camelCaseName.split(".").reduce((obj, name) => obj[name], object);

/**
 * 校验单个条件（equal / startsWith）。不满足时返回 false 并打印原因；满足时返回 true。
 * 注意：显式返回 true 是对原内联实现的修复而非等价提取——原实现匹配成功时返回 undefined，
 * reduce 的 `!previousResult ? previousResult : ...` 会让首个满足的条件把累加值短路为
 * undefined，被调用方 `!result` 误判为不满足，skip 条件因此从未生效过。
 * 未知 operator（配置拼错等）按不满足处理：CI 多跑一次好过漏跑（fail-safe）。
 * @param {any} head_commit
 * @param {{ property: string; operator: "equal" | "startsWith"; value: string; }} condition
 * @returns {boolean}
 */
export const checkCondition = (head_commit, { property, operator, value }) => {
    console.info("Checking condition:", { property, operator, value });
    const commitValue = getPropertyFromCamelCase(head_commit, property);
    if (operator === "equal") {
        if (commitValue !== value) {
            console.info("Condition not met, skip.");
            return false;
        }
    } else if (operator === "startsWith") {
        if (!commitValue.startsWith(value)) {
            console.info("Condition not met, exit.");
            return false;
        }
    } else {
        console.info("Unknown operator, treat the condition as not met:", operator);
        return false;
    }
    return true;
};

/**
 * 按条件列表依次校验，任一条件不满足即短路为 false（原为两处逐字重复的 reduce 表达式）。
 * @param {any} head_commit
 * @param {{ property: string; operator: "equal" | "startsWith"; value: string; }[]} conditions
 * @returns {boolean}
 */
export const checkConditions = (head_commit, conditions) => conditions.reduce((previousResult, condition) => !previousResult ? previousResult : checkCondition(head_commit, condition), true);
