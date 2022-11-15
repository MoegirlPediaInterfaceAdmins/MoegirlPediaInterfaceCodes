"use strict";
const fetch = global.fetch;
/**
 * @type {{ json: (input: RequestInfo | URL, init?: RequestInit) => Promise<any>, text: (input: RequestInfo | URL, init?: RequestInit) => Promise<string> }}
 */
module.exports = {
    json: async (input, init) => await (await fetch(input, init)).json(),
    text: async (input, init) => await (await fetch(input, init)).text(),
};
