"use strict";
/**
 * @type {axios.AxiosStatic}
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const instance = axios.create({
    httpAgent,
    httpsAgent,
    decompress: true,
});
module.exports = instance;
