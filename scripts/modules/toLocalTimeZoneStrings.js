import fixZero from "./fixZero.js";
/**
 * @typedef  {(date: Date = new Date()) => string} generator
 */
/**
 * @typedef  {object} toLocalTimeZoneStrings
 * @property {generator} ISO
 * @property {generator} normal
 * @property {generator} mySQL
 * @property {generator} onlyDate
 * @property {generator} dateAndHour
 * @property {generator} cdnLog
 * @property {generator} onlyTime
 * @property {generator} mailer
 * @property {generator} onlyMonthAndDay
 */
/**
 * @type {toLocalTimeZoneStrings}
 */
export function ISO(date = new Date()) { return `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}T${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}+${fixZero(Math.floor(-date.getTimezoneOffset() / 60))}:${fixZero(-date.getTimezoneOffset() % 60)}`; }
export function normal(date = new Date()) { return `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`; }
export function mySQL(date = new Date()) { return `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`; }
export function onlyDate(date = new Date()) { return `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`; }
export function dateAndHour(date = new Date()) { return `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}`; }
export function cdnLog(date = new Date()) { return `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}`; }
export function onlyTime(date = new Date()) { return `${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}+${fixZero(Math.floor(-date.getTimezoneOffset() / 60))}:${fixZero(-date.getTimezoneOffset() % 60)}`; }
export function mailer(date = new Date()) { return `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}_${fixZero(date.getHours())}-${fixZero(date.getMinutes())}-${fixZero(date.getSeconds())}`; }
export function onlyMonthAndDay(date = new Date()) { return `${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`; }
