import console from "../modules/console.js";

/**
 * 按 `.` 分隔的点路径从对象取值，如 ("commit.author.name", obj)。
 * @param {any} object
 * @param {string} camelCaseName
 */
export const getPropertyFromCamelCase = (object, camelCaseName) => camelCaseName.split(".").reduce((obj, name) => obj[name], object);

/**
 * 校验单个条件（equal / startsWith）。不满足时返回 false 并打印原因；
 * 满足时返回 true（原内联实现返回 undefined，靠 truthiness 判断，此处显式返回 true，行为等价）。
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
