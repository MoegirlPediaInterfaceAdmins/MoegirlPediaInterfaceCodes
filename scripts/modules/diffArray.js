"use strict";
/**
 * 
 * @param {any[]} a 
 * @param {any[]} b 
 * @returns 
 */
module.exports = (a, b) => a.filter((item) => !b.includes(item)).length + b.filter((item) => !a.includes(item)) > 0;
