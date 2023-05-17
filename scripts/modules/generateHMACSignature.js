import crypto from "crypto";
const generateHMACSignature = (key, raw, algorithm) => crypto.createHmac(algorithm, key).update(raw).digest("hex");
