import crypto from "crypto";
/**
 * @param {string} key 
 * @param {Buffer} raw 
 * @param {string} [algorithm] 
 */
const generateHMACSignature = (key, raw, algorithm) => `${algorithm}=${crypto.createHmac(algorithm, key).update(raw).digest("hex")}`;
