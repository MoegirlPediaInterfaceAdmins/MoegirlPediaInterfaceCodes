"use strict";
const fixZero = require("./fixZero.js");
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
module.exports = {
    ISO: (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}T${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}+${fixZero(Math.floor(-date.getTimezoneOffset() / 60))}:${fixZero(-date.getTimezoneOffset() % 60)}`,
    normal: (date = new Date()) => `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`,
    mySQL: (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`,
    onlyDate: (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`,
    dateAndHour: (date = new Date()) => `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}`,
    cdnLog: (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}`,
    onlyTime: (date = new Date()) => `${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}+${fixZero(Math.floor(-date.getTimezoneOffset() / 60))}:${fixZero(-date.getTimezoneOffset() % 60)}`,
    mailer: (date = new Date()) => `${date.getFullYear()}-${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}_${fixZero(date.getHours())}-${fixZero(date.getMinutes())}-${fixZero(date.getSeconds())}`,
    onlyMonthAndDay: (date = new Date()) => `${fixZero(date.getMonth() + 1)}-${fixZero(date.getDate())}`,
};