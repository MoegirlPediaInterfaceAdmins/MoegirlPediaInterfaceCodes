/**
 * 引自 uuid@8.3.2
 */
"use strict";
(() => {
    /**
     * @source https://github.com/uuidjs/uuid/blob/v8.3.2/src/regex.js
     */
    const REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;


    /**
     * @source https://github.com/uuidjs/uuid/blob/v8.3.2/src/validate.js
     */
    function validate(t) {
        return "string" === typeof t && REGEX.test(t);
    }


    if (typeof crypto.randomUUID !== "function" || !validate(crypto.randomUUID())) {


        /**
         * @source https://github.com/uuidjs/uuid/blob/v8.3.2/src/rng-browser.js
         */
        const rnds8 = new Uint8Array(16);
        const rng = () => crypto.getRandomValues(rnds8);


        /**
         * @source https://github.com/uuidjs/uuid/blob/v8.3.2/src/stringify.js
         */
        /**
         * @type {string[]}
         */
        const byteToHex = [];
        for (let i = 0; i < 256; ++i) {
            byteToHex.push((i + 256).toString(16).substring(1));
        }
        /**
         * @param {Uint8Array} arr
         */
        const stringify = (arr, offset = 0) => {
            const uuid = `${byteToHex[arr[offset + 0]]}${byteToHex[arr[offset + 1]]}${byteToHex[arr[offset + 2]]}${byteToHex[arr[offset + 3]]}-${byteToHex[arr[offset + 4]]}${byteToHex[arr[offset + 5]]}-${byteToHex[arr[offset + 6]]}${byteToHex[arr[offset + 7]]}-${byteToHex[arr[offset + 8]]}${byteToHex[arr[offset + 9]]}-${byteToHex[arr[offset + 10]]}${byteToHex[arr[offset + 11]]}${byteToHex[arr[offset + 12]]}${byteToHex[arr[offset + 13]]}${byteToHex[arr[offset + 14]]}${byteToHex[arr[offset + 15]]}`.toLowerCase();
            if (!validate(uuid)) {
                throw TypeError("Stringified UUID is invalid");
            }
            return uuid;
        };


        /**
         * @source https://github.com/uuidjs/uuid/blob/v8.3.2/src/v4.js
         */
        crypto.randomUUID = (options = {}, buf, offset = 0) => {
            const rnds = options.random || (options.rng || rng)();
            rnds[6] = rnds[6] & 0x0f | 0x40;
            rnds[8] = rnds[8] & 0x3f | 0x80;
            if (buf) {
                for (let i = 0; i < 16; ++i) {
                    buf[offset + i] = rnds[i];
                }
                return buf;
            }
            return stringify(rnds);
        };
    }
})();
