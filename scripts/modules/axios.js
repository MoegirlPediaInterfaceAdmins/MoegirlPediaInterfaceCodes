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
instance.interceptors.request.use((req) => {
    const url = new URL(axios.getUri(req)); // getUri will build the final URI, merging defaults
    const params = new URLSearchParams(url.searchParams);

    url.search = "";

    req.url = url.href; // The URL without query params
    req.params = params; // The merged query params from defaults + request

    return req;
});
module.exports = instance;
