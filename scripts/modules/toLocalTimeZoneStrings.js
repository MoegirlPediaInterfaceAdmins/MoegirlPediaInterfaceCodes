import fixZero from "./fixZero.js";

// 偏移的符号与数值必须分开处理：负偏移直接参与补零会得到 "+-5:00" 这类畸形串，
// 半时区（如 UTC-3:30 的 +210 分钟）取余还会得到负分钟数（"-30"）
const offsetString = (date) => {
    const offset = -date.getTimezoneOffset();
    const sign = offset < 0 ? "-" : "+";
    return `${sign}${fixZero(Math.floor(Math.abs(offset) / 60))}:${fixZero(Math.abs(offset) % 60)}`;
};

export const ISO = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}T${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}${offsetString(date)}`;
export const normal = (date = new Date()) => `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`;
export const mySQL = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`;
export const onlyDate = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`;
export const dateAndHour = (date = new Date()) => `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}`;
export const cdnLog = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}`;
export const onlyTime = (date = new Date()) => `${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}${offsetString(date)}`;
export const mailer = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}_${fixZero(date.getHours())}-${fixZero(date.getMinutes())}-${fixZero(date.getSeconds())}`;
export const onlyMonthAndDay = (date = new Date()) => `${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`;
export default { ISO, normal, mySQL, onlyDate, dateAndHour, cdnLog, onlyTime, mailer, onlyMonthAndDay };
