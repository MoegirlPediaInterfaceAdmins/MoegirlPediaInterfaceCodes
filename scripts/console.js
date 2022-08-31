"use strict";
const prefixable = ["log", "warn", "debug", "info", "error"];
const toLocalTimeZoneStrings = require("./toLocalTimeZoneStrings.js");
/**
 * @type {console}
 */
module.exports = new Proxy(console, {
    get: (t, p) => prefixable.includes(p) ? (...args) => t[p].bind(t)(toLocalTimeZoneStrings.ISO(), ...args) : t[p].bind(t),
});