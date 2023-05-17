import crypto from "crypto";
/**
 * @param {string} key 
 * @param {Buffer} raw 
 * @param {string} [algorithm] 
 */
const generateHMACSignature = (key, raw, algorithm = "SHA3-512") => `${algorithm}=${crypto.createHmac(algorithm, key).update(raw).digest("hex")}`;
export default generateHMACSignature;
