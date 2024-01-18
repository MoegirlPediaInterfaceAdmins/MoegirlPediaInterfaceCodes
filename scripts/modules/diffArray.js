/**
 * @param { any[] } a
 * @param { any[] } b
 */
export default (a, b) => a.filter((item) => !b.includes(item)).length + b.filter((item) => !a.includes(item)) > 0;
