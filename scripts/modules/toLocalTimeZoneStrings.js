import fixZero from "./fixZero.js";

export const ISO = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}T${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}+${fixZero(Math.floor(-date.getTimezoneOffset() / 60))}:${fixZero(-date.getTimezoneOffset() % 60)}`;
export const normal = (date = new Date()) => `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`;
export const mySQL = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`;
export const onlyDate = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`;
export const dateAndHour = (date = new Date()) => `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}`;
export const cdnLog = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}`;
export const onlyTime = (date = new Date()) => `${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}+${fixZero(Math.floor(-date.getTimezoneOffset() / 60))}:${fixZero(-date.getTimezoneOffset() % 60)}`;
export const mailer = (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}_${fixZero(date.getHours())}-${fixZero(date.getMinutes())}-${fixZero(date.getSeconds())}`;
export const onlyMonthAndDay = (date = new Date()) => `${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`;
export default { ISO, normal, mySQL, onlyDate, dateAndHour, cdnLog, onlyTime, mailer, onlyMonthAndDay };
