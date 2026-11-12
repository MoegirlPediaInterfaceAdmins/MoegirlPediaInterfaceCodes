import { describe, expect, it } from "vitest";
import { formatSize } from "../src/logic/format";

describe("formatSize", () => {
    it("正常值格式化", () => {
        expect(formatSize(100)).toBe("100 B");
        expect(formatSize(1023)).toBe("1023 B");
        expect(formatSize(1024)).toBe("1 KB");
        expect(formatSize(1536)).toBe("2 KB");
        expect(formatSize(1024 * 1024 - 1)).toBe("1024 KB");
        expect(formatSize(1024 * 1024)).toBe("1.0 MB");
        expect(formatSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
        expect(formatSize(1024 * 1024 * 1024 - 1)).toBe("1024.0 MB");
        expect(formatSize(1024 * 1024 * 1024)).toBe("1.0 GB");
        expect(formatSize(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
    });

    it("边界值：0 / 负数降级为 0 B", () => {
        expect(formatSize(0)).toBe("0 B");
        expect(formatSize(-1)).toBe("0 B");
        expect(formatSize(-100)).toBe("0 B");
        expect(formatSize(-1024)).toBe("0 B");
    });

    it("边界值：NaN 降级为 0 B", () => {
        expect(formatSize(NaN)).toBe("0 B");
        expect(formatSize(Number.NaN)).toBe("0 B");
    });

    it("边界值：Infinity 降级为 0 B", () => {
        expect(formatSize(Infinity)).toBe("0 B");
        expect(formatSize(Number.POSITIVE_INFINITY)).toBe("0 B");
        expect(formatSize(Number.NEGATIVE_INFINITY)).toBe("0 B");
    });

    it("单位临界值", () => {
        expect(formatSize(1023)).toBe("1023 B");
        expect(formatSize(1024)).toBe("1 KB");

        expect(formatSize(1024 * 1024 - 1)).toBe("1024 KB");
        expect(formatSize(1024 * 1024)).toBe("1.0 MB");

        expect(formatSize(1024 * 1024 * 1024 - 1)).toBe("1024.0 MB");
        expect(formatSize(1024 * 1024 * 1024)).toBe("1.0 GB");
    });

    it("小数精度", () => {
        expect(formatSize(1.23 * 1024 * 1024)).toBe("1.2 MB");
        expect(formatSize(1.25 * 1024 * 1024)).toBe("1.3 MB");
        expect(formatSize(1.26 * 1024 * 1024)).toBe("1.3 MB");
        expect(formatSize(9.99 * 1024 * 1024 * 1024)).toBe("10.0 GB");

        expect(formatSize(1.4 * 1024)).toBe("1 KB");
        expect(formatSize(1.5 * 1024)).toBe("2 KB");
        expect(formatSize(100.4)).toBe("100 B");
        expect(formatSize(100.5)).toBe("101 B");
    });
});
