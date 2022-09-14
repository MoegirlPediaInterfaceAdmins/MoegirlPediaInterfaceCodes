"use strict";
/**
 * @param {number | string} n base string
 * @param {number} [l=2] minimum length, default is `2`
 * @returns 
 */
module.exports = (n, l = 2) => `${n}`.padStart(l, "0");
