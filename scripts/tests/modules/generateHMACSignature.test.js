import { describe, expect, it } from "vitest";
import generateHMACSignature from "../../modules/generateHMACSignature.js";

// 期望向量由 node -e 调用 node:crypto 独立计算后写死，非由被测实现反推
describe("generateHMACSignature", () => {
    it("默认算法输出 SHA3-512 前缀与十六进制摘要", () => {
        expect(generateHMACSignature("key", "raw")).toBe("SHA3-512=ec7326779b0978a4e66346232c79d283b631dceb109e705d4e33faab093841af784b959057761550623a8b565951dac7d057796e767ab6de08d8168f9dc65557");
    });

    it("显式指定算法时前缀随算法名", () => {
        expect(generateHMACSignature("secret", "data", "sha256")).toBe("sha256=1b2c16b75bd2a870c114153ccda5bcfca63314bc722fa160d690de133ccbb9db");
    });

    it("相同输入两次调用结果一致", () => {
        expect(generateHMACSignature("key", "raw")).toBe(generateHMACSignature("key", "raw"));
    });

    it("正文不同则摘要不同", () => {
        expect(generateHMACSignature("key", "raw")).not.toBe(generateHMACSignature("key", "other"));
    });

    it("空正文也可计算摘要", () => {
        expect(generateHMACSignature("key", "")).toBe("SHA3-512=7539119b6367aa902bdc6f558d20c906d6acbd4aba3fd344eb08b0200144a1fa453ff6e7919962358be53f6db2a320d1852c52a3dea3e907070775f7a91f1282");
    });

    it("接受 Uint8Array 形式的密钥与正文", () => {
        expect(generateHMACSignature(new TextEncoder().encode("k"), new TextEncoder().encode("v"))).toBe("SHA3-512=67549851b38f00594dce08a5e367b4c248606e3d77c5b1110be5a7731bf9ca3fd48e17a34c4d8abf72c34c6076e486b03f094844029e59be016198b19d7d66b6");
    });
});
