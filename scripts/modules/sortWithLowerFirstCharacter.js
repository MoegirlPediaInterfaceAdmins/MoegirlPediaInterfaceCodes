/**
 * @param {string} str
 * @returns {string}
 */
export const toLowerFirstCharacter = (str) => `${str[0].toLowerCase()}${str.slice(1)}`;
/**
 * @param {string[]} list
 * @return {string[]}
 */
export const sortWithLowerFirstCharacter = (list) => {
    const lowerCaseList = list.map((item) => toLowerFirstCharacter(item));
    lowerCaseList.sort();
    list.sort((a, b) => lowerCaseList.indexOf(toLowerFirstCharacter(a)) - lowerCaseList.indexOf(toLowerFirstCharacter(b)));
    return list;
};
export default { toLowerFirstCharacter, sortWithLowerFirstCharacter };
