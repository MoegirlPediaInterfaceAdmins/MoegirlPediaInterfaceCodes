import crypto from "node:crypto";
/**
 * @param { crypto.BinaryLike } key
 * @param { crypto.BinaryLike } raw
 * @param { string } [algorithm] default `"SHA3-512"`
 */
export default (key, raw, algorithm = "SHA3-512") => `${algorithm}=${crypto.createHmac(algorithm, key).update(raw).digest("hex")}`;
