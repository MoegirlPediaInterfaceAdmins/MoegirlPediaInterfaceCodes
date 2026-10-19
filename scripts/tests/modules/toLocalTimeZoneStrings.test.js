import { describe, expect, it } from "vitest";
import toLocalTimeZoneStrings, { ISO, normal, mySQL, onlyDate, dateAndHour, cdnLog, onlyTime, mailer, onlyMonthAndDay } from "../../modules/toLocalTimeZoneStrings.js";

// vitest 配置已固定 TZ=UTC：本地分量即 UTC 分量，偏移段恒为 +00:00
const full = new Date(Date.UTC(2024, 2, 5, 7, 8, 9, 123)); // 2024-03-05 07:08:09.123
const padded = new Date(Date.UTC(2023, 0, 9, 5, 6, 7, 8)); // 2023-01-09 05:06:07.008

describe("toLocalTimeZoneStrings", () => {
    it("ISO 输出 T 分隔的完整时间戳与 +00:00 偏移", () => {
        expect(ISO(full)).toBe("2024-03-05T07:08:09.123+00:00");
        expect(ISO(padded)).toBe("2023-01-09T05:06:07.008+00:00");
    });

    it("normal 输出斜杠日期加时分秒毫秒", () => {
        expect(normal(full)).toBe("2024/03/05 07:08:09.123");
        expect(normal(padded)).toBe("2023/01/09 05:06:07.008");
    });

    it("mySQL 输出连字符日期加时分秒毫秒", () => {
        expect(mySQL(full)).toBe("2024-03-05 07:08:09.123");
        expect(mySQL(padded)).toBe("2023-01-09 05:06:07.008");
    });

    it("onlyDate 只保留年月日", () => {
        expect(onlyDate(full)).toBe("2024-03-05");
        expect(onlyDate(padded)).toBe("2023-01-09");
    });

    it("dateAndHour 保留到小时", () => {
        expect(dateAndHour(full)).toBe("2024/03/05 07");
        expect(dateAndHour(padded)).toBe("2023/01/09 05");
    });

    it("cdnLog 不含毫秒", () => {
        expect(cdnLog(full)).toBe("2024-03-05 07:08:09");
        expect(cdnLog(padded)).toBe("2023-01-09 05:06:07");
    });

    it("onlyTime 只有时分秒毫秒与偏移", () => {
        expect(onlyTime(full)).toBe("07:08:09.123+00:00");
        expect(onlyTime(padded)).toBe("05:06:07.008+00:00");
    });

    it("mailer 以下划线连日期、连字符连时间", () => {
        expect(mailer(full)).toBe("2024-03-05_07-08-09");
        expect(mailer(padded)).toBe("2023-01-09_05-06-07");
    });

    it("onlyMonthAndDay 只保留月日", () => {
        expect(onlyMonthAndDay(full)).toBe("03-05");
        expect(onlyMonthAndDay(padded)).toBe("01-09");
    });

    it("默认导出包含全部九个格式化函数", () => {
        expect(Object.keys(toLocalTimeZoneStrings).sort()).toEqual(["ISO", "normal", "mySQL", "onlyDate", "dateAndHour", "cdnLog", "onlyTime", "mailer", "onlyMonthAndDay"].sort());
    });
});
