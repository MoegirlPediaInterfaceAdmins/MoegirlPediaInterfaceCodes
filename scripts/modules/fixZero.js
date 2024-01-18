/**
 * @param { number | string } n base string
 * @param { number } [l=2] minimum length, default is `2`
 */
export default (n, l = 2) => `${n}`.padStart(l, "0");
