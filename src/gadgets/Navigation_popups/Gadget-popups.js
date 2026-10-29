/**
 * 本文件由 packages/Navigation_popups 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */
"use strict";
class Downloader {
  constructor(url) {
    this.id = null;
    this.lastModified = null;
    this.aborted = false;
    this.method = "GET";
    this.async = true;
    this.http = new XMLHttpRequest();
    this.url = url;
  }
  abort() {
    this.aborted = true;
    this.http.abort();
  }
  getData() {
    return this.http.responseText;
  }
  setTarget() {
    this.http.open(this.method, this.url, this.async);
    this.http.setRequestHeader("Api-User-Agent", userAgent);
  }
  getReadyState() {
    return this.http.readyState;
  }
  start() {
    downloadsInProgress[String(this.id)] = this;
    this.http.send(null);
  }
  getLastModifiedDate() {
    let lastmod = null;
    try {
      lastmod = this.http.getResponseHeader("Last-Modified");
    } catch {
    }
    if (lastmod) {
      return new Date(lastmod);
    }
    return null;
  }
  setCallback(f) {
    this.http.onreadystatechange = f;
  }
  getStatus() {
    return this.http.status;
  }
}
let userAgent = "";
const setDownloaderUserAgent = (ua) => {
  userAgent = ua;
};
const downloadsInProgress = {};
const numberIdOrNull = (id) => {
  if (typeof id === "number") {
    return id;
  }
  return null;
};
const newDownload = (url, id, callback) => {
  const d = new Downloader(url);
  d.id = numberIdOrNull(id);
  d.setTarget();
  const f = function() {
    if (d.getReadyState() === 4) {
      Reflect.deleteProperty(downloadsInProgress, String(this.id));
      try {
        if (d.getStatus() === 200) {
          d.data = d.getData();
          d.lastModified = d.getLastModifiedDate();
          void callback(d);
        }
      } catch {
      }
    }
  };
  d.setCallback(f);
  return d;
};
const fakeDownload = (url, id, callback, data, lastModified, owner) => {
  const d = newDownload(url, null, callback);
  d.owner = owner;
  d.id = id ?? null;
  d.data = data ?? void 0;
  d.lastModified = lastModified ?? null;
  void callback(d);
};
const startDownload = (url, id, callback) => {
  const d = newDownload(url, id, callback);
  d.start();
  return d;
};
const abortAllDownloads = () => {
  for (const x of Object.keys(downloadsInProgress)) {
    try {
      downloadsInProgress[x].aborted = true;
      downloadsInProgress[x].abort();
      Reflect.deleteProperty(downloadsInProgress, x);
    } catch {
    }
  }
};

const popupStrings = {
  /////////////////////////////////////
  // summary data, searching etc.
  /////////////////////////////////////
  article: wgULS("\u6761\u76EE", "\u689D\u76EE"),
  category: wgULS("\u4E2A\u5206\u7C7B", "\u500B\u5206\u985E"),
  categories: wgULS("\u4E2A\u5206\u7C7B", "\u500B\u5206\u985E"),
  image: wgULS("\u4E2A\u6587\u4EF6", "\u500B\u6A94\u6848"),
  images: wgULS("\u4E2A\u6587\u4EF6", "\u500B\u6A94\u6848"),
  stub: wgULS("\u5C0F\u4F5C\u54C1", "\u5C0F\u4F5C\u54C1"),
  "section stub": wgULS("\u5C0F\u7AE0\u8282", "\u5C0F\u7AE0\u7BC0"),
  "Empty page": wgULS("\u7A7A\u9875\u9762", "\u7A7A\u9801\u9762"),
  kB: wgULS("\u5343\u5B57\u8282<sub>\uFF08\u4EE51000\u4E3A\u4E00\u8FDB\uFF09</sub>", "\u5343\u4F4D\u5143\u7D44<sub>\uFF08\u4EE51000\u70BA\u4E00\u9032\uFF09</sub>"),
  bytes: wgULS("\u5B57\u8282", "\u4F4D\u5143\u7D44"),
  day: wgULS("\u5929", "\u5929"),
  days: wgULS("\u5929", "\u5929"),
  hour: wgULS("\u5C0F\u65F6", "\u5C0F\u6642"),
  hours: wgULS("\u5C0F\u65F6", "\u5C0F\u6642"),
  minute: wgULS("\u5206", "\u5206"),
  minutes: wgULS("\u5206", "\u5206"),
  second: wgULS("\u79D2", "\u79D2"),
  seconds: wgULS("\u79D2", "\u79D2"),
  week: wgULS("\u5468", "\u5468"),
  weeks: wgULS("\u5468", "\u5468"),
  month: wgULS("\u6708", "\u6708"),
  months: wgULS("\u6708", "\u6708"),
  year: wgULS("\u5E74", "\u5E74"),
  years: wgULS("\u5E74", "\u5E74"),
  search: wgULS("\u641C\u7D22", "\u641C\u5C0B"),
  SearchHint: wgULS("\u641C\u7D22\u5305\u542B %s \u7684\u9875\u9762", "\u641C\u5C0B\u5305\u542B %s \u7684\u9801\u9762"),
  web: "Google",
  global: wgULS("\u5168\u57DF", "\u5168\u57DF"),
  "more...": wgULS("\u66F4\u591A\u2026\u2026", "\u66F4\u591A\u2026\u2026"),
  /////////////////////////////////////
  // article-related actions and info
  // (some actions also apply to user pages)
  /////////////////////////////////////
  actions: wgULS("\u64CD\u4F5C", "\u52D5\u4F5C"),
  // view articles and view talk
  popupsMenu: wgULS("Popups", "Popups"),
  "disable previews": wgULS("\u7981\u7528\u9884\u89C8", "\u7981\u7528\u9810\u89BD"),
  togglePreviewsHint: wgULS("\u5207\u6362\u672C\u9875 Popups \u7684\u9884\u89C8\u5F00\u5173", "\u5207\u63DB\u672C\u9801 Popups \u7684\u9810\u89BD\u958B\u95DC"),
  "toggle previews": wgULS("\u5207\u6362\u9884\u89C8\u5F00\u5173", "\u5207\u63DB\u9810\u89BD\u958B\u95DC"),
  reset: wgULS("\u590D\u4F4D", "\u8907\u4F4D"),
  disable: wgULS("\u7981\u7528 Popups", "\u7981\u7528 Popups"),
  disablePopupsHint: wgULS("\u5728\u672C\u9875\u7981\u7528 Popups\uFF0C\u5237\u65B0\u9875\u9762\u4EE5\u91CD\u65B0\u542F\u7528\u3002", "\u5728\u672C\u9801\u7981\u7528 Popups\uFF0C\u91CD\u65B0\u6574\u7406\u9801\u9762\u4EE5\u91CD\u65B0\u555F\u7528\u3002"),
  purgePopupsHint: wgULS("\u590D\u4F4D Popups\uFF0C\u6E05\u9664\u6240\u6709\u7F13\u5B58\u6570\u636E\u3002", "\u8907\u4F4D Popups\uFF0C\u6E05\u9664\u6240\u6709\u5FEB\u53D6\u8CC7\u6599\u3002"),
  PopupsHint: wgULS("\u590D\u4F4D Popups\uFF0C\u6E05\u9664\u6240\u6709\u7F13\u5B58\u6570\u636E\u3002", "\u8907\u4F4D Popups\uFF0C\u6E05\u9664\u6240\u6709\u5FEB\u53D6\u8CC7\u6599\u3002"),
  spacebar: wgULS("\u7A7A\u683C", "\u7A7A\u683C"),
  view: wgULS("\u67E5\u770B", "\u6AA2\u8996"),
  "view article": wgULS("\u67E5\u770B\u6761\u76EE", "\u6AA2\u8996\u689D\u76EE"),
  viewHint: wgULS("\u524D\u5F80 %s", "\u524D\u5F80 %s"),
  talk: wgULS("\u8BA8\u8BBA", "\u8A0E\u8AD6"),
  "talk page": wgULS("\u8BA8\u8BBA\u9875", "\u8A0E\u8AD6\u9801"),
  "this&nbsp;revision": wgULS("\u6B64\u4FEE\u8BA2\u7248\u672C", "\u6B64\u4FEE\u8A02\u7248\u672C"),
  "revision %s of %s": wgULS("\u9875\u9762 $2 \u7684\u4FEE\u8BA2\u7248\u672C $1", "\u9801\u9762 $2 \u7684\u4FEE\u8A02\u7248\u672C $1"),
  "Revision %s of %s": wgULS("\u9875\u9762 $2 \u7684\u4FEE\u8BA2\u7248\u672C $1", "\u9801\u9762 $2 \u7684\u4FEE\u8A02\u7248\u672C $1"),
  "the revision prior to revision %s of %s": wgULS("\u9875\u9762 $2 \u7684\u4FEE\u8BA2\u7248\u672C $1 \u4E4B\u524D\u7684\u4FEE\u8BA2\u7248\u672C", "\u9801\u9762 $2 \u7684\u4FEE\u8A02\u7248\u672C $1 \u4E4B\u524D\u7684\u4FEE\u8A02\u7248\u672C"),
  "Toggle image size": wgULS("\u70B9\u51FB\u5207\u6362\u56FE\u7247\u5927\u5C0F", "\u9EDE\u64CA\u5207\u63DB\u5716\u7247\u5927\u5C0F"),
  del: wgULS("\u5220\u9664", "\u5220\u9664"),
  // delete, protect, move
  "delete": wgULS("\u5220\u9664", "\u5220\u9664"),
  deleteHint: wgULS("\u5220\u9664 %s", "\u5220\u9664 %s"),
  undeleteShort: wgULS("\u6062\u590D", "\u6062\u5FA9"),
  UndeleteHint: wgULS("\u6062\u590D %s", "\u6062\u5FA9 %s"),
  protect: wgULS("\u4FDD\u62A4", "\u4FDD\u8B77"),
  protectHint: wgULS("\u4FDD\u62A4 %s", "\u4FDD\u8B77 %s"),
  unprotectShort: wgULS("\u89E3\u9664", "\u89E3\u9664"),
  unprotectHint: wgULS("\u89E3\u9664\u5BF9 %s \u7684\u4FDD\u62A4", "\u89E3\u9664\u5C0D %s \u7684\u4FDD\u8B77"),
  move: wgULS("\u79FB\u52A8", "\u79FB\u52D5"),
  "move page": wgULS("\u79FB\u52A8\u9875\u9762", "\u79FB\u52D5\u9801\u9762"),
  MovepageHint: wgULS("\u4FEE\u6539 %s \u7684\u6807\u9898", "\u4FEE\u6539 %s \u7684\u6A19\u984C"),
  edit: wgULS("\u7F16\u8F91", "\u7DE8\u8F2F"),
  // edit articles and talk
  "edit article": wgULS("\u7F16\u8F91\u6761\u76EE", "\u7DE8\u8F2F\u689D\u76EE"),
  editHint: wgULS("\u4FEE\u6539 %s \u7684\u5185\u5BB9", "\u4FEE\u6539 %s \u7684\u5167\u5BB9"),
  "edit talk": wgULS("\u7F16\u8F91\u8BA8\u8BBA\u9875", "\u7DE8\u8F2F\u5C0D\u8A71\u9801", null, null, "\u7DE8\u8F2F\u8A0E\u8AD6\u9801"),
  "new": wgULS("\u65B0", "\u65B0"),
  "new topic": wgULS("\u65B0\u8BDD\u9898", "\u65B0\u8A71\u984C"),
  newSectionHint: wgULS("\u5728 %s \u589E\u52A0\u65B0\u7684\u8BA8\u8BBA\u8BDD\u9898", "\u5728 %s \u589E\u52A0\u65B0\u7684\u8A0E\u8AD6\u8A71\u984C"),
  "null edit": wgULS("\u7A7A\u7F16\u8F91", "\u7A7A\u7DE8\u8F2F"),
  nullEditHint: wgULS("\u8FDB\u884C\u4E00\u6B21\u5BF9 %s \u7684\u7A7A\u7F16\u8F91", "\u88FD\u9020\u4E00\u6B21\u5C0D %s \u7684\u7A7A\u7DE8\u8F2F"),
  hist: wgULS("\u5386\u53F2", "\u6B77\u53F2"),
  // history, diffs, editors, related
  history: wgULS("\u5386\u53F2", "\u6B77\u53F2"),
  historyHint: wgULS("%s \u7684\u4FEE\u8BA2\u5386\u53F2", "%s \u7684\u4FEE\u8A02\u6B77\u53F2"),
  "History preview failed": wgULS("\u5386\u53F2\u8BB0\u5F55\u9884\u89C8\u5931\u8D25 :-(", "\u6B77\u53F2\u8A18\u9304\u9810\u89BD\u5931\u6557 :-("),
  last: wgULS("\u4E4B\u524D", "\u4E4B\u524D"),
  // [[MediaWiki:Last]]
  lastEdit: wgULS("\u6700\u8FD1\u66F4\u6539", "\u6700\u8FD1\u66F4\u6539"),
  "show last edit": wgULS("\u6700\u8FD1\u4E00\u6B21\u66F4\u6539", "\u6700\u65B0\u4E00\u6B21\u4FEE\u8A02"),
  "Show the last edit": wgULS("\u663E\u793A\u6700\u8FD1\u4E00\u6B21\u66F4\u6539\u7684\u5DEE\u5F02", "\u986F\u793A\u6700\u65B0\u4E00\u6B21\u4FEE\u8A02\u7684\u5DEE\u7570"),
  lastContrib: wgULS("\u6700\u8FD1\u7F16\u8F91", "\u6700\u8FD1\u7DE8\u8F2F"),
  "last set of edits": wgULS("\u6700\u8FD1\u7F16\u8F91", "\u6700\u8FD1\u7DE8\u8F2F"),
  lastContribHint: wgULS("\u663E\u793A\u7531\u6700\u540E\u4E00\u4F4D\u7F16\u8F91\u8005\u9020\u6210\u7684\u5DEE\u5F02", "\u986F\u793A\u7531\u6700\u5F8C\u4E00\u4F4D\u7DE8\u8F2F\u8005\u88FD\u9020\u7684\u5DEE\u7570"),
  cur: wgULS("\u5F53\u524D", "\u7576\u524D"),
  diffCur: wgULS("\u4E0E\u5F53\u524D\u7248\u672C\u7684\u5DEE\u5F02", "\u8207\u76EE\u524D\u7248\u672C\u7684\u5DEE\u7570"),
  "Show changes since revision %s": wgULS("\u663E\u793A\u81EA\u4FEE\u8BA2\u7248\u672C %s \u7684\u5DEE\u5F02", "\u986F\u793A\u81EA\u4FEE\u8A02\u7248\u672C %s \u7684\u5DEE\u7570"),
  "%s old": wgULS("%s \u524D\u7684\u6700\u540E\u7248\u672C", "%s \u524D\u7684\u6700\u5F8C\u7248\u672C"),
  // as in 4 weeks old
  oldEdit: wgULS("\u65E7\u7F16\u8F91", "\u820A\u7DE8\u8F2F"),
  purge: wgULS("\u6E05\u9664\u7F13\u5B58", "\u6E05\u9664\u5FEB\u53D6"),
  purgeHint: wgULS("\u6E05\u9664\u670D\u52A1\u5668\u4E2D %s \u7684\u7F13\u5B58", "\u6E05\u9664\u4F3A\u670D\u5668\u4E2D %s \u7684\u5FEB\u53D6"),
  raw: wgULS("\u6E90\u4EE3\u7801", "\u539F\u59CB\u78BC"),
  rawHint: wgULS("\u67E5\u770B %s \u7684\u6E90\u4EE3\u7801", "\u6AA2\u8996 %s \u7684\u539F\u59CB\u78BC"),
  render: wgULS("\u4EC5\u6B63\u6587", "\u50C5\u6B63\u6587"),
  renderHint: wgULS("\u663E\u793A %s \u7684\u7EAFHTML\u89E3\u6790\uFF08\u4EC5\u6B63\u6587\u5185\u5BB9\uFF09", "\u986F\u793A %s \u7684\u7D14HTML\u89E3\u6790\uFF08\u50C5\u6B63\u6587\u5167\u5BB9\uFF09"),
  "Show the edit made to get revision": wgULS("\u663E\u793A\u7F16\u8F91\u4EE5\u5F97\u5230\u4FEE\u8BA2\u7248\u672C", "\u986F\u793A\u7DE8\u8F2F\u4EE5\u5F97\u5230\u4FEE\u8A02\u7248\u672C"),
  sinceMe: wgULS("\u81EA\u6211", "\u81EA\u6211"),
  "changes since mine": wgULS("\u81EA\u6211\u4FEE\u8BA2\u7684\u5DEE\u5F02", "\u81EA\u6211\u4FEE\u8A02\u7684\u5DEE\u7570"),
  sinceMeHint: wgULS("\u663E\u793A\u81EA\u6211\u4E0A\u6B21\u4FEE\u6539\u4EE5\u6765\u7684\u5DEE\u5F02", "\u986F\u793A\u81EA\u6211\u4E0A\u6B21\u4FEE\u6539\u4EE5\u4F86\u7684\u5DEE\u7570"),
  "Couldn't find an edit by %s\nin the last %s edits to\n%s": wgULS("\u5728 $3 \u6700\u8FD1 $2 \u6B21\u7F16\u8F91\u4E2D\u627E\u4E0D\u5230 $1 \u505A\u51FA\u7684\u4FEE\u6539", "\u5728 $3 \u6700\u8FD1 $2 \u6B21\u7DE8\u8F2F\u4E2D\u627E\u4E0D\u5230 $1 \u505A\u51FA\u7684\u4FEE\u6539"),
  eds: wgULS("\u7F16\u8F91", "\u7DE8\u8F2F"),
  editors: wgULS("\u7F16\u8F91\u8005", "\u7DE8\u8F2F\u8005"),
  editorListHint: wgULS("\u5217\u51FA\u7F16\u8F91\u8FC7 %s \u7684\u7528\u6237", "\u5217\u51FA\u7DE8\u8F2F\u904E %s \u7684\u4F7F\u7528\u8005", null, null, "\u5217\u51FA\u7DE8\u8F2F\u904E %s \u7684\u7528\u6236"),
  related: wgULS("\u76F8\u5173", "\u76F8\u95DC"),
  relatedChanges: wgULS("\u76F8\u5173\u66F4\u6539", "\u76F8\u95DC\u66F4\u6539"),
  "related changes": wgULS("\u76F8\u5173\u66F4\u6539", "\u76F8\u95DC\u66F4\u6539"),
  RecentchangeslinkedHint: wgULS("\u663E\u793A\u76F8\u5173 %s \u7684\u4FEE\u6539", "\u986F\u793A\u76F8\u95DC %s \u7684\u4FEE\u6539"),
  editOld: wgULS("\u7F16\u8F91\u65E7\u7248", "\u7DE8\u8F2F\u820A\u7248"),
  // edit old version, or revert
  rv: wgULS("\u56DE\u9000", "\u9084\u539F"),
  revert: wgULS("\u56DE\u9000", "\u9084\u539F"),
  revertHint: wgULS("\u56DE\u9000\u5230 %s", "\u9084\u539F\u5230 %s"),
  undo: wgULS("\u64A4\u9500", "\u64A4\u92B7"),
  undoHint: wgULS("\u64A4\u9500\u8FD9\u6B21\u7F16\u8F91", "\u64A4\u92B7\u9019\u6B21\u7DE8\u8F2F"),
  defaultpopupRedlinkSummary: wgULS("\u79FB\u9664\u5230\u7A7A\u9875\u9762[[%s]]\u7684\u94FE\u63A5 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u79FB\u9664\u5230\u7A7A\u9801\u9762[[%s]]\u7684\u9023\u7D50 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupFixDabsSummary: wgULS("\u6D88\u6B67\u4E49[[%s]]\u5230[[%s]] \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u6D88\u6B67\u7FA9[[%s]]\u5230[[%s]] \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupFixRedirsSummary: wgULS("\u5FFD\u7565\u4ECE[[%s]]\u5230[[%s]]\u7684\u91CD\u5B9A\u5411 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u5FFD\u7565\u5F9E[[%s]]\u5230[[%s]]\u7684\u91CD\u65B0\u5C0E\u5411 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupExtendedRevertSummary: wgULS("\u56DE\u9000\u5230$2\u5728$1\u65F6\u7F16\u8F91\u7684\u4FEE\u8BA2\u7248\u672C$3 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u9084\u539F\u5230$2\u5728$1\u6642\u88FD\u4F5C\u7684\u4FEE\u8A02\u7248\u672C$3 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupRevertToPreviousSummary: wgULS("\u56DE\u9000\u5230\u4FEE\u8BA2\u7248\u672C%s\u7684\u4E0A\u4E00\u4E2A\u7248\u672C \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u9084\u539F\u5230\u4FEE\u8A02\u7248\u672C%s\u7684\u4E0A\u4E00\u500B\u7248\u672C \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupRevertSummary: wgULS("\u56DE\u9000\u5230\u4FEE\u8BA2\u7248\u672C%s \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u9084\u539F\u5230\u4FEE\u8A02\u7248\u672C%s \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupQueriedRevertToPreviousSummary: wgULS("\u56DE\u9000\u5230\u4FEE\u8BA2\u7248\u672C$1\u7684\u4E0A\u4E00\u4E2A\u7248\u672C\uFF0C\u7531$3\u5728$2\u65F6\u7F16\u8F91 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u9084\u539F\u5230\u4FEE\u8A02\u7248\u672C$1\u7684\u4E0A\u4E00\u500B\u7248\u672C\uFF0C\u7531$3\u5728$2\u6642\u88FD\u4F5C \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupQueriedRevertSummary: wgULS("\u56DE\u9000\u5230$3\u5728$2\u65F6\u7F16\u8F91\u7684\u4FEE\u8BA2\u7248\u672C$1 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u9084\u539F\u5230$3\u5728$2\u6642\u88FD\u4F5C\u7684\u4FEE\u8A02\u7248\u672C$1 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  defaultpopupRmDabLinkSummary: wgULS("\u79FB\u9664\u5230\u6D88\u6B67\u4E49\u9875[[%s]]\u7684\u94FE\u63A5 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]", "\u79FB\u9664\u5230\u6D88\u6B67\u7FA9\u9801[[%s]]\u7684\u9023\u7D50 \u2014\u2014[[Help:Popups\u5C0F\u5DE5\u5177|Popups]]"),
  Redirects: wgULS("\u91CD\u5B9A\u5411", "\u91CD\u5B9A\u5411"),
  // as in Redirects to ...
  // " to ": wgULS("到", "到"),
  // as in Redirects to ...
  "Bypass redirect": wgULS("\u5FFD\u7565\u91CD\u5B9A\u5411", "\u5FFD\u7565\u91CD\u65B0\u5C0E\u5411"),
  "Fix this redirect": wgULS("\u4FEE\u590D\u91CD\u5B9A\u5411", "\u4FEE\u5FA9\u91CD\u65B0\u5C0E\u5411"),
  disambig: wgULS("\u6D88\u6B67\u4E49", "\u6D88\u6B67\u7FA9"),
  // add or remove dab etc.
  disambigHint: wgULS("\u6D88\u6B67\u4E49\u8FD9\u4E2A\u94FE\u63A5\u5230 [[%s]]", "\u6D88\u6B67\u7FA9\u9019\u500B\u9023\u7D50\u5230 [[%s]]"),
  "Click to disambiguate this link to:": wgULS("\u70B9\u51FB\u4EE5\u6D88\u6B67\u4E49\u8FD9\u4E2A\u94FE\u63A5\u5230\uFF1A", "\u9EDE\u64CA\u4EE5\u6D88\u6B67\u7FA9\u9019\u500B\u9023\u7D50\u5230\uFF1A"),
  "remove this link": wgULS("\u79FB\u9664\u94FE\u63A5", "\u79FB\u9664\u9023\u7D50"),
  "remove all links to this page from this article": wgULS("\u79FB\u9664\u6B64\u6761\u76EE\u5230\u8FD9\u9875\u7684\u6240\u6709\u94FE\u63A5", "\u79FB\u9664\u6B64\u689D\u76EE\u5230\u9019\u9801\u7684\u6240\u6709\u9023\u7D50"),
  "remove all links to this disambig page from this article": wgULS("\u79FB\u9664\u6B64\u6761\u76EE\u5230\u8FD9\u6D88\u6B67\u4E49\u7684\u6240\u6709\u94FE\u63A5", "\u79FB\u9664\u6B64\u689D\u76EE\u5230\u9019\u6D88\u6B67\u7FA9\u7684\u6240\u6709\u9023\u7D50"),
  mainlink: wgULS("\u4E3B\u94FE\u63A5", "\u4E3B\u9023\u7D50"),
  // links, watch, unwatch
  wikiLink: wgULS("\u4E2A\u5185\u90E8\u94FE\u63A5", "\u500B\u5167\u90E8\u9023\u7D50"),
  wikiLinks: wgULS("\u4E2A\u5185\u90E8\u94FE\u63A5", "\u500B\u5167\u90E8\u9023\u7D50"),
  "links here": wgULS("\u94FE\u5165", "\u93C8\u5165"),
  whatLinksHere: wgULS("\u94FE\u5165\u9875\u9762", "\u93C8\u5165\u9801\u9762"),
  "what links here": wgULS("\u94FE\u5165\u9875\u9762", "\u93C8\u5165\u9801\u9762"),
  WhatlinkshereHint: wgULS("\u663E\u793A\u94FE\u63A5\u5230 %s \u7684\u9875\u9762", "\u986F\u793A\u9023\u7D50\u5230 %s \u7684\u9801\u9762"),
  unwatchShort: wgULS("\u53D6\u6D88", "\u53D6\u6D88"),
  watchThingy: wgULS("\u76D1\u89C6", "\u76E3\u8996"),
  // called watchThingy because {}.watch is a function
  watchHint: wgULS("\u52A0\u5165 %s \u5230\u6211\u7684\u76D1\u89C6\u5217\u8868", "\u52A0\u5165 %s \u5230\u6211\u7684\u76E3\u8996\u5217\u8868"),
  unwatchHint: wgULS("\u4ECE\u6211\u7684\u76D1\u89C6\u5217\u8868\u79FB\u9664 %s", "\u5F9E\u6211\u7684\u76E3\u8996\u5217\u8868\u79FB\u9664 %s"),
  "Only found one editor: %s made %s edits": wgULS("\u4EC5\u627E\u5230\u4E00\u4F4D\u7F16\u8005\uFF1A%s \u5236\u9020\u4E86 %s \u6B21\u7F16\u8F91", "\u50C5\u627E\u5230\u4E00\u4F4D\u7DE8\u8005\uFF1A%s \u88FD\u9020\u4E86 %s \u6B21\u7DE8\u8F2F"),
  "%s seems to be the last editor to the page %s": wgULS("%s \u770B\u4E0A\u53BB\u662F %s \u8FD9\u9875\u7684\u6700\u540E\u4E00\u4F4D\u7F16\u8005", "%s \u770B\u4E0A\u53BB\u662F %s \u9019\u9801\u7684\u6700\u5F8C\u4E00\u4F4D\u7DE8\u8005"),
  rss: wgULS("RSS", "RSS"),
  /////////////////////////////////////
  // diff previews
  /////////////////////////////////////
  "Diff truncated for performance reasons": wgULS("\u51FA\u4E8E\u6027\u80FD\u8003\u8651\uFF0C\u5DEE\u5F02\u5DF2\u88AB\u622A\u65AD", "\u51FA\u65BC\u6548\u80FD\u8003\u616E\uFF0C\u5DEE\u7570\u5DF2\u88AB\u622A\u65B7"),
  "Old revision": wgULS("\u65E7\u7248\u672C", "\u820A\u7248\u672C"),
  "New revision": wgULS("\u65B0\u7248\u672C", "\u65B0\u7248\u672C"),
  "Something went wrong :-(": wgULS("\u51FA\u95EE\u9898\u4E86 :-(", "\u51FA\u554F\u984C\u4E86 :-("),
  "Empty revision, maybe non-existent": wgULS("\u7A7A\u7684\u4FEE\u8BA2\uFF0C\u53EF\u80FD\u5E76\u4E0D\u5B58\u5728", "\u7A7A\u7684\u4FEE\u8A02\uFF0C\u53EF\u80FD\u4E26\u4E0D\u5B58\u5728"),
  "Unknown date": wgULS("\u672A\u77E5\u65E5\u671F", "\u672A\u77E5\u65E5\u671F"),
  /////////////////////////////////////
  // other special previews
  /////////////////////////////////////
  "Empty category": wgULS("\u7A7A\u7684\u5206\u7C7B", "\u7A7A\u7684\u5206\u985E"),
  "Category members (%s shown)": wgULS("\u5206\u7C7B\u6210\u5458\uFF08%s \u663E\u793A\uFF09", "\u5206\u985E\u6210\u54E1\uFF08%s \u986F\u793A\uFF09"),
  "No image links found": wgULS("\u672A\u627E\u5230\u6587\u4EF6\u94FE\u63A5", "\u672A\u627E\u5230\u6A94\u6848\u9023\u7D50"),
  "File links": wgULS("\u6587\u4EF6\u94FE\u63A5", "\u6A94\u6848\u9023\u7D50"),
  "not commons": wgULS("\u7EF4\u57FA\u5171\u4EAB\u4E2D\u65E0\u6B64\u540D\u79F0\u7684\u6587\u4EF6\u3002", "\u7DAD\u57FA\u5171\u4EAB\u4E2D\u7121\u6B64\u540D\u7A31\u7684\u6A94\u6848\u3002"),
  "commons only": wgULS("\u6B64\u6587\u4EF6\u6765\u81EA\u7EF4\u57FA\u5171\u4EAB\u3002", "\u6B64\u6A94\u6848\u4F86\u81EA\u7DAD\u57FA\u5171\u4EAB\u3002"),
  "No image found": wgULS("\u627E\u4E0D\u5230\u6587\u4EF6", "\u627E\u4E0D\u5230\u6A94\u6848"),
  "commons dupe": wgULS("\u7EF4\u57FA\u5171\u4EAB\u4E2D\u5B58\u5728\u6B64\u6587\u4EF6\u7684\u526F\u672C\u3002", "\u7DAD\u57FA\u5171\u4EAB\u4E2D\u5B58\u5728\u6B64\u6A94\u6848\u7684\u526F\u672C\u3002"),
  "commons conflict": wgULS("\u7EF4\u57FA\u5171\u4EAB\u4E2D\u5B58\u5728\u6B64\u6587\u4EF6\u540D\u79F0\u4E0D\u540C\u7684\u526F\u672C\u3002", "\u7DAD\u57FA\u5171\u4EAB\u4E2D\u5B58\u5728\u6B64\u6A94\u540D\u7A31\u4E0D\u540C\u7684\u526F\u672C\u3002"),
  /////////////////////////////////////
  // user-related actions and info
  /////////////////////////////////////
  user: wgULS("\u7528\u6237", "\u4F7F\u7528\u8005", null, null, "\u7528\u6236"),
  // user page, talk, email, space
  "user&nbsp;page": wgULS("\u7528\u6237\u9875", "\u4F7F\u7528\u8005\u9801\u9762", null, null, "\u7528\u6236\u9801"),
  "user talk": wgULS("\u7528\u6237\u8BA8\u8BBA\u9875", "\u4F7F\u7528\u8005\u8A0E\u8AD6\u9801\u9762", null, null, "\u7528\u6236\u8A0E\u8AD6\u9801"),
  "edit user talk": wgULS("\u7F16\u8F91\u7528\u6237\u8BA8\u8BBA\u9875", "\u7DE8\u8F2F\u4F7F\u7528\u8005\u8A0E\u8AD6\u9801\u9762", null, null, "\u7DE8\u8F2F\u7528\u6236\u8A0E\u8AD6\u9801"),
  "leave comment": wgULS("\u7559\u8A00", "\u7559\u8A00"),
  email: wgULS("\u7535\u90AE", "\u96FB\u90F5"),
  "email user": wgULS("\u7535\u90AE\u7528\u6237", "\u96FB\u90F5\u4F7F\u7528\u8005"),
  EmailuserHint: wgULS("\u7ED9 %s \u53D1\u9001\u7535\u5B50\u90AE\u4EF6", "\u7D66 %s \u767C\u9001\u96FB\u5B50\u90F5\u4EF6"),
  space: wgULS("\u5B50\u9875\u9762", "\u5B50\u9801\u9762"),
  // short form for userSpace link
  PrefixindexHint: wgULS("\u663E\u793A %s \u7684\u7528\u6237\u9875\u5B50\u9875\u9762", "\u986F\u793A %s \u7684\u4F7F\u7528\u8005\u9801\u9762\u5B50\u9801\u9762", null, null, "\u986F\u793A %s \u7684\u7528\u6236\u9801\u5B50\u9801\u9762"),
  count: wgULS("\u7EDF\u8BA1", "\u7D71\u8A08"),
  // contributions, tree, log
  "edit counter": wgULS("\u7F16\u8F91\u6B21\u6570", "\u7DE8\u8F2F\u6B21\u6578"),
  katelinkHint: wgULS("%s \u7684\u7F16\u8F91\u6B21\u6570", "%s \u7684\u7DE8\u8F2F\u6B21\u6578"),
  contribs: wgULS("\u8D21\u732E", "\u8CA2\u737B"),
  contributions: wgULS("\u8D21\u732E", "\u8CA2\u737B"),
  deletedContribs: wgULS("\u5DF2\u5220\u9664\u7684\u8D21\u732E", "\u5DF2\u522A\u9664\u7684\u8CA2\u737B"),
  ContributionsHint: wgULS("%s \u7684\u7528\u6237\u8D21\u732E", "%s \u7684\u4F7F\u7528\u8005\u8CA2\u737B", null, null, "%s \u7684\u7528\u6236\u8CA2\u737B"),
  tree: wgULS("\u6811", "\u6A39"),
  contribsTreeHint: wgULS("\u6839\u636E\u547D\u540D\u7A7A\u95F4\u67E5\u770B %s \u7684\u8D21\u732E", "\u6839\u64DA\u547D\u540D\u7A7A\u9593\u6AA2\u8996 %s \u7684\u8CA2\u737B"),
  log: wgULS("\u65E5\u5FD7", "\u65E5\u8A8C"),
  "user log": wgULS("\u7528\u6237\u65E5\u5FD7", "\u4F7F\u7528\u8005\u65E5\u8A8C", null, null, "\u7528\u6236\u65E5\u8A8C"),
  userLogHint: wgULS("\u663E\u793A %s \u7684\u7528\u6237\u65E5\u5FD7", "\u986F\u793A %s \u7684\u4F7F\u7528\u8005\u65E5\u8A8C", null, null, "\u986F\u793A %s \u7684\u7528\u6236\u65E5\u8A8C"),
  arin: wgULS("ARIN \u67E5\u8BE2", "ARIN \u67E5\u8A62"),
  // ARIN lookup, block user or IP
  "Look up %s in ARIN whois database": wgULS("\u5728 ARIN Whois \u6570\u636E\u5E93\u4E2D\u67E5\u8BE2 %s", "\u5728 ARIN Whois \u6578\u64DA\u5EAB\u4E2D\u67E5\u8A62 %s"),
  unblockShort: wgULS("\u89E3\u9664", "\u89E3\u9664"),
  block: wgULS("\u5C01\u7981", "\u5C01\u9396"),
  "block user": wgULS("\u5C01\u7981\u7528\u6237", "\u5C01\u9396\u4F7F\u7528\u8005", null, null, "\u5C01\u9396\u7528\u6236"),
  IpblocklistHint: wgULS("\u89E3\u5C01 %s", "\u89E3\u5C01 %s"),
  BlockipHint: wgULS("\u5C01\u7981 %s", "\u5C01\u9396 %s"),
  "block log": wgULS("\u5C01\u7981\u65E5\u5FD7", "\u5C01\u9396\u65E5\u8A8C"),
  blockLogHint: wgULS("\u663E\u793A %s \u7684\u5C01\u7981\u65E5\u5FD7", "\u986F\u793A %s \u7684\u5C01\u9396\u65E5\u8A8C"),
  protectLogHint: wgULS("\u663E\u793A %s \u7684\u4FDD\u62A4\u65E5\u5FD7", "\u986F\u793A %s \u7684\u4FDD\u8B77\u65E5\u8A8C"),
  pageLogHint: wgULS("\u663E\u793A %s \u7684\u65E5\u5FD7", "\u986F\u793A %s \u7684\u65E5\u8A8C"),
  deleteLogHint: wgULS("\u663E\u793A %s \u7684\u5220\u9664\u65E5\u5FD7", "\u986F\u793A %s \u7684\u522A\u9664\u65E5\u8A8C"),
  "Invalid %s %s": wgULS("\u9009\u9879 %s \u4E0D\u53EF\u7528\uFF1A%s", "\u9078\u9805 %s \u4E0D\u53EF\u7528\uFF1A%s"),
  m: wgULS("\u5C0F", "\u5C0F"),
  /////////////////////////////////////
  // Autoediting
  /////////////////////////////////////
  "Enter a non-empty edit summary or press cancel to abort": wgULS("\u8F93\u5165\u7F16\u8F91\u6458\u8981\uFF0C\u6216\u6309\u53D6\u6D88\u4E2D\u6B62\u64CD\u4F5C", "\u8F38\u5165\u7DE8\u8F2F\u6458\u8981\uFF0C\u6216\u6309\u53D6\u6D88\u4E2D\u6B62\u64CD\u4F5C"),
  "Failed to get revision information, please edit manually.\n\n": wgULS("\u83B7\u53D6\u4FEE\u8BA2\u7248\u672C\u4FE1\u606F\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u4FEE\u6539\u3002\n\n", "\u53D6\u5F97\u4FEE\u8A02\u7248\u672C\u8CC7\u8A0A\u5931\u6557\uFF0C\u8ACB\u624B\u52D5\u4FEE\u6539\u3002\n\n"),
  "The %s button has been automatically clicked. Please wait for the next page to load.": wgULS("\u6309\u94AE %s \u5DF2\u88AB\u81EA\u52A8\u70B9\u51FB\uFF0C\u8BF7\u7B49\u5F85\u4E0B\u4E00\u4E2A\u9875\u9762\u52A0\u8F7D\u3002", "\u6309\u9215 %s \u5DF2\u88AB\u81EA\u52D5\u9EDE\u64CA\uFF0C\u8ACB\u7B49\u5F85\u4E0B\u4E00\u500B\u9801\u9762\u8F09\u5165\u3002"),
  "Could not find button %s. Please check the settings in your javascript file.": wgULS("\u627E\u4E0D\u5230\u6309\u94AE %s\uFF0C\u8BF7\u68C0\u67E5\u60A8 JavaScript \u6587\u4EF6\u4E2D\u7684\u8BBE\u7F6E\u3002", "\u627E\u4E0D\u5230\u6309\u9215 %s\uFF0C\u8ACB\u6AA2\u67E5\u60A8 JavaScript \u6A94\u6848\u4E2D\u7684\u8A2D\u5B9A\u3002"),
  /////////////////////////////////////
  // Popups setup
  /////////////////////////////////////
  "Open full-size image": wgULS("\u67E5\u770B\u5168\u5C3A\u5BF8\u56FE\u50CF", "\u6AA2\u8996\u5168\u5C3A\u5BF8\u5716\u7247"),
  zxy: wgULS("zxy", "zxy"),
  /////////////////////////////////////
  // 以下内容由 [[User:AnnAngela]] 补正
  /////////////////////////////////////
  globalSearchHint: wgULS("\u5728\u7EF4\u57FA\u767E\u79D1\u5176\u4ED6\u8BED\u8A00\u641C\u7D22\u201C%s\u201D", "\u5728\u7DAD\u57FA\u767E\u79D1\u5176\u4ED6\u8A9E\u8A00\u641C\u5C0B\u300C%s\u300D"),
  googleSearchHint: wgULS("\u5728 Google \u4E0A\u641C\u7D22\u201C%s\u201D", "\u5728 Google \u4E0A\u641C\u5C0B\u300C%s\u300D"),
  "enable previews": wgULS("\u542F\u7528\u9884\u89C8", "\u555F\u7528\u9810\u89BD"),
  "show preview": wgULS("\u7981\u7528\u9884\u89C8", "\u7981\u7528\u9810\u89BD"),
  historyfeedHint: wgULS("\u8BE5\u9875\u9762\u7684\u8FD1\u671F\u66F4\u6539 RSS feed", "\u8A72\u9801\u9762\u7684\u8FD1\u671F\u66F4\u6539 RSS feed"),
  "send thanks": wgULS("\u53D1\u9001\u611F\u8C22", "\u50B3\u9001\u611F\u8B1D"),
  ThanksHint: wgULS("\u5411\u8BE5\u7528\u6237\u53D1\u9001\u4E00\u5C01\u611F\u8C22\u6D88\u606F", "\u5411\u8A72\u4F7F\u7528\u8005\u50B3\u9001\u4E00\u5C01\u611F\u8B1D\u8A0A\u606F", null, null, "\u5411\u8A72\u7528\u6236\u50B3\u9001\u4E00\u5C01\u611F\u8B1D\u8A0A\u606F"),
  "mark patrolled": wgULS("\u6807\u8BB0\u4E3A\u5DF2\u5DE1\u67E5", "\u6A19\u8A18\u70BA\u5DF2\u5DE1\u67E5"),
  markpatrolledHint: wgULS("\u6807\u8BB0\u8BE5\u7F16\u8F91\u4E3A\u5DF2\u5DE1\u67E5", "\u6A19\u8A18\u8A72\u7DE8\u8F2F\u70BA\u5DF2\u5DE1\u67E5"),
  "Could not marked this edit as patrolled": wgULS("\u65E0\u6CD5\u6807\u8BB0\u8BE5\u7F16\u8F91\u4E3A\u5DF2\u5DE1\u67E5", "\u7121\u6CD5\u6A19\u8A18\u8A72\u7DE8\u8F2F\u70BA\u5DF2\u5DE1\u67E5"),
  defaultpopupReviewedSummary: wgULS("\u6807\u8BB0\u4ECE\u7248\u672C%s\u5230%s\u95F4\u7684\u7F16\u8F91\u4E3A\u5DF2\u5DE1\u67E5", "\u6A19\u8A18\u5F9E\u7248\u672C%s\u5230%s\u9593\u7684\u7DE8\u8F2F\u70BA\u5DF2\u5DE1\u67E5"),
  "Image from Commons": wgULS("\u6765\u81EA\u7EF4\u57FA\u5171\u4EAB\u7684\u56FE\u7247", "\u4F86\u81EA\u7DAD\u57FA\u5171\u7528\u7684\u5716\u7247"),
  "Description page": wgULS("\u56FE\u7247\u63CF\u8FF0\u9875", "\u5716\u7247\u63CF\u8FF0\u9801"),
  "Alt text:": wgULS("\u66FF\u6362\u6587\u672C\uFF08Alt\uFF09\uFF1A", "\u66FF\u63DB\u6587\u5B57\uFF08Alt\uFF09\uFF1A"),
  revdel: wgULS("\u5386\u53F2\u7248\u672C\u88AB\u9690\u85CF", "\u6B77\u53F2\u7248\u672C\u88AB\u96B1\u85CF"),
  editCounterLinkHint: wgULS("\u7528\u6237%s\u7684\u7F16\u8F91\u6B21\u6570", "\u4F7F\u7528\u8005%s\u7684\u7DE8\u8F2F\u6B21\u6578", null, null, "\u7528\u6236%s\u7684\u7DE8\u8F2F\u6B21\u6578"),
  DeletedcontributionsHint: wgULS("\u7528\u6237%s\u7684\u88AB\u5220\u9664\u7F16\u8F91\u6B21\u6570", "\u4F7F\u7528\u8005%s\u7684\u88AB\u522A\u9664\u7DE8\u8F2F\u6B21\u6578", null, null, "\u7528\u6236%s\u7684\u88AB\u522A\u9664\u7DE8\u8F2F\u6B21\u6578"),
  "No backlinks found": wgULS("\u627E\u4E0D\u5230\u94FE\u5165\u9875\u9762", "\u627E\u4E0D\u5230\u93C8\u5165\u9801\u9762"),
  " and more": wgULS("\u4EE5\u53CA\u5176\u4ED6\u9875\u9762", "\u4EE5\u53CA\u5176\u4ED6\u9801\u9762"),
  "Download preview data": wgULS("\u4E0B\u8F7D\u9884\u89C8\u6570\u636E", "\u4E0B\u8F09\u9810\u89BD\u8CC7\u6599"),
  "Invalid or IP user": wgULS("\u9519\u8BEF\u7684\u7528\u6237\u540D\u6216IP\u7528\u6237", "\u932F\u8AA4\u7684\u4F7F\u7528\u8005\u540D\u7A31\u6216IP\u4F7F\u7528\u8005", null, null, "\u932F\u8AA4\u7684\u7528\u6236\u540D\u6216IP\u7528\u6236"),
  "Not a registered username": wgULS("\u975E\u5DF2\u6CE8\u518C\u7684\u7528\u6237", "\u975E\u5DF2\u8A3B\u518A\u7684\u4F7F\u7528\u8005", null, null, "\u975E\u5DF2\u8A3B\u518A\u7684\u7528\u6236"),
  BLOCKED: wgULS("\u88AB\u5C01\u7981", "\u88AB\u5C01\u9396"),
  "Has blocks": wgULS("\u88AB\u90E8\u5206\u5C01\u7981", "\u88AB\u90E8\u5206\u5C01\u9396"),
  " edits since: ": wgULS("\u6B21\u7F16\u8F91\uFF0C\u6CE8\u518C\u65E5\u671F\u4E3A", "\u6B21\u7DE8\u8F2F\uFF0C\u8A3B\u518A\u65E5\u671F\u70BA"),
  "last edit on ": wgULS("\u6700\u540E\u4E00\u6B21\u7F16\u8F91\u4E8E", "\u6700\u5F8C\u4E00\u6B21\u7DE8\u8F2F\u65BC"),
  EmailUserHint: wgULS("\u7ED9 %s \u53D1\u9001\u7535\u5B50\u90AE\u4EF6", "\u7D66 %s \u767C\u9001\u96FB\u5B50\u90F5\u4EF6"),
  RANGEBLOCKED: wgULS("IP\u6BB5\u88AB\u5C01\u7981", "IP\u6BB5\u88AB\u5C01\u9396"),
  "IP user": wgULS("IP\u7528\u6237", "IP\u4F7F\u7528\u8005", null, null, "IP\u7528\u6236"),
  "\u2640": "\u2640",
  "\u2642": "\u2642",
  HIDDEN: wgULS("\u5168\u57DF\u9690\u85CF", "\u5168\u57DF\u96B1\u85CF"),
  LOCKED: wgULS("\u5168\u57DF\u9501\u5B9A", "\u5168\u57DF\u9396\u5B9A"),
  "Invalid user": wgULS("\u975E\u6CD5\u7528\u6237\u540D", "\u975E\u6CD5\u4F7F\u7528\u8005\u540D\u7A31", null, null, "\u975E\u6CD5\u7528\u6236\u540D"),
  diff: wgULS("\u5DEE\u5F02", "\u5DEE\u7570"),
  " to ": wgULS("\u81F3", "\u81F3"),
  autoedit_version: "np20140416",
  PrefixIndexHint: wgULS("\u663E\u793A\u7528\u6237%s\u7684\u5B50\u9875\u9762", "\u986F\u793A\u4F7F\u7528\u8005%s\u7684\u5B50\u9801\u9762", null, null, "\u986F\u793A\u7528\u6236%s\u7684\u5B50\u9801\u9762"),
  nullEditSummary: wgULS("\u8FDB\u884C\u4E00\u6B21\u96F6\u7F16\u8F91", "\u9032\u884C\u4E00\u6B21\u96F6\u7DE8\u8F2F"),
  // 用户组名称从系统消息获取（“非自动确认用户”并不是用户组，所以在这里写死）
  "group-no-autoconfirmed": wgULS("\u975E\u81EA\u52A8\u786E\u8BA4\u7528\u6237", "\u975E\u81EA\u52D5\u78BA\u8A8D\u4F7F\u7528\u8005", null, null, "\u975E\u81EA\u52D5\u78BA\u8A8D\u7528\u6236"),
  separator: "\u3001",
  comma: "\uFF0C"
};

const englishStrings = {
  article: "article",
  category: "category",
  categories: "categories",
  image: "image",
  images: "images",
  stub: "stub",
  "section stub": "section stub",
  "Empty page": "Empty page",
  kB: "kB",
  bytes: "bytes",
  day: "day",
  days: "days",
  hour: "hour",
  hours: "hours",
  minute: "minute",
  minutes: "minutes",
  second: "second",
  seconds: "seconds",
  week: "week",
  weeks: "weeks",
  search: "search",
  SearchHint: "Find English Wikipedia articles containing %s",
  web: "web",
  global: "global",
  globalSearchHint: "Search across Wikipedias in different languages for %s",
  googleSearchHint: "Google for %s",
  actions: "actions",
  popupsMenu: "popups",
  togglePreviewsHint: "Toggle preview generation in popups on this page",
  "enable previews": "enable previews",
  "disable previews": "disable previews",
  "toggle previews": "toggle previews",
  "show preview": "show preview",
  reset: "reset",
  "more...": "more...",
  disable: "disable popups",
  disablePopupsHint: "Disable popups on this page. Reload page to re-enable.",
  historyfeedHint: "RSS feed of recent changes to this page",
  purgePopupsHint: "Reset popups, clearing all cached popup data.",
  PopupsHint: "Reset popups, clearing all cached popup data.",
  spacebar: "space",
  view: "view",
  "view article": "view article",
  viewHint: "Go to %s",
  talk: "talk",
  "talk page": "talk page",
  "this&nbsp;revision": "this&nbsp;revision",
  "revision %s of %s": "revision %s of %s",
  "Revision %s of %s": "Revision %s of %s",
  "the revision prior to revision %s of %s": "the revision prior to revision %s of %s",
  "Toggle image size": "Click to toggle image size",
  del: "del",
  "delete": "delete",
  deleteHint: "Delete %s",
  undeleteShort: "un",
  UndeleteHint: "Show the deletion history for %s",
  protect: "protect",
  protectHint: "Restrict editing rights to %s",
  unprotectShort: "un",
  unprotectHint: "Allow %s to be edited by anyone again",
  "send thanks": "send thanks",
  ThanksHint: "Send a thank you notification to this user",
  move: "move",
  "move page": "move page",
  MovepageHint: "Change the title of %s",
  edit: "edit",
  "edit article": "edit article",
  editHint: "Change the content of %s",
  "edit talk": "edit talk",
  "new": "new",
  "new topic": "new topic",
  newSectionHint: "Start a new section on %s",
  "null edit": "null edit",
  nullEditHint: "Submit an edit to %s, making no changes ",
  hist: "hist",
  history: "history",
  historyHint: "List the changes made to %s",
  "History preview failed": "History preview failed :-(",
  last: "prev",
  lastEdit: "lastEdit",
  "mark patrolled": "mark patrolled",
  markpatrolledHint: "Mark this edit as patrolled",
  "Could not marked this edit as patrolled": "Could not marked this edit as patrolled",
  "show last edit": "most recent edit",
  "Show the last edit": "Show the effects of the most recent change",
  lastContrib: "lastContrib",
  "last set of edits": "latest edits",
  lastContribHint: "Show the net effect of changes made by the last editor",
  cur: "cur",
  diffCur: "diffCur",
  "Show changes since revision %s": "Show changes since revision %s",
  "%s old": "%s old",
  oldEdit: "oldEdit",
  purge: "purge",
  purgeHint: "Demand a fresh copy of %s",
  raw: "source",
  rawHint: "Download the source of %s",
  render: "simple",
  renderHint: "Show a plain HTML version of %s",
  "Show the edit made to get revision": "Show the edit made to get revision",
  sinceMe: "sinceMe",
  "changes since mine": "diff my edit",
  sinceMeHint: "Show changes since my last edit",
  "Couldn't find an edit by %s\nin the last %s edits to\n%s": "Couldn't find an edit by %s\nin the last %s edits to\n%s",
  eds: "eds",
  editors: "editors",
  editorListHint: "List the users who have edited %s",
  related: "related",
  relatedChanges: "relatedChanges",
  "related changes": "related changes",
  RecentchangeslinkedHint: "Show changes in articles related to %s",
  editOld: "editOld",
  rv: "rv",
  revert: "revert",
  revertHint: "Revert to %s",
  defaultpopupReviewedSummary: "Accepted by reviewing the [[Special:diff/%s/%s|difference]] between this version and previously accepted version using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupRedlinkSummary: "Removing link to empty page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupFixDabsSummary: "Disambiguate [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupFixRedirsSummary: "Redirect bypass from [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupExtendedRevertSummary: "Revert to revision dated %s by %s, oldid %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupRevertToPreviousSummary: "Revert to the revision prior to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupRevertSummary: "Revert to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupQueriedRevertToPreviousSummary: "Revert to the revision prior to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupQueriedRevertSummary: "Revert to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  defaultpopupRmDabLinkSummary: "Remove link to dab page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
  Redirects: "Redirects",
  " to ": " to ",
  "Bypass redirect": "Bypass redirect",
  "Fix this redirect": "Fix this redirect",
  disambig: "disambig",
  disambigHint: "Disambiguate this link to [[%s]]",
  "Click to disambiguate this link to:": "Click to disambiguate this link to:",
  "remove this link": "remove this link",
  "remove all links to this page from this article": "remove all links to this page from this article",
  "remove all links to this disambig page from this article": "remove all links to this disambig page from this article",
  mainlink: "mainlink",
  wikiLink: "wikiLink",
  wikiLinks: "wikiLinks",
  "links here": "links here",
  whatLinksHere: "whatLinksHere",
  "what links here": "what links here",
  WhatlinkshereHint: "List the pages that are hyperlinked to %s",
  unwatchShort: "un",
  watchThingy: "watch",
  watchHint: "Add %s to my watchlist",
  unwatchHint: "Remove %s from my watchlist",
  "Only found one editor: %s made %s edits": "Only found one editor: %s made %s edits",
  "%s seems to be the last editor to the page %s": "%s seems to be the last editor to the page %s",
  rss: "rss",
  "Diff truncated for performance reasons": "Diff truncated for performance reasons",
  "Old revision": "Old revision",
  "New revision": "New revision",
  "Something went wrong :-(": "Something went wrong :-(",
  "Empty revision, maybe non-existent": "Empty revision, maybe non-existent",
  "Unknown date": "Unknown date",
  "Empty category": "Empty category",
  "Category members (%s shown)": "Category members (%s shown)",
  "No image links found": "No image links found",
  "File links": "File links",
  "No image found": "No image found",
  "Image from Commons": "Image from Commons",
  "Description page": "Description page",
  "Alt text:": "Alt text:",
  revdel: "Hidden revision",
  user: "user",
  "user&nbsp;page": "user&nbsp;page",
  "user talk": "user talk",
  "edit user talk": "edit user talk",
  "leave comment": "leave comment",
  email: "email",
  "email user": "email user",
  EmailuserHint: "Send an email to %s",
  space: "space",
  PrefixIndexHint: "Show pages in the userspace of %s",
  count: "count",
  "edit counter": "edit counter",
  editCounterLinkHint: "Count the contributions made by %s",
  contribs: "contribs",
  contributions: "contributions",
  deletedContribs: "deleted contributions",
  DeletedcontributionsHint: "List deleted edits made by %s",
  ContributionsHint: "List the contributions made by %s",
  log: "log",
  "user log": "user log",
  userLogHint: "Show %s's user log",
  arin: "ARIN lookup",
  "Look up %s in ARIN whois database": "Look up %s in the ARIN whois database",
  unblockShort: "un",
  block: "block",
  "block user": "block user",
  IpblocklistHint: "Unblock %s",
  BlockipHint: "Prevent %s from editing",
  "block log": "block log",
  blockLogHint: "Show the block log for %s",
  protectLogHint: "Show the protection log for %s",
  pageLogHint: "Show the page log for %s",
  deleteLogHint: "Show the deletion log for %s",
  "Invalid %s %s": "The option %s is invalid: %s",
  "No backlinks found": "No backlinks found",
  " and more": " and more",
  undo: "undo",
  undoHint: "undo this edit",
  "Download preview data": "Download preview data",
  "Invalid or IP user": "Invalid or IP user",
  "Not a registered username": "Not a registered username",
  BLOCKED: "BLOCKED",
  "Has blocks": "Has blocks",
  " edits since: ": " edits since: ",
  "last edit on ": "last edit on ",
  "Enter a non-empty edit summary or press cancel to abort": "Enter a non-empty edit summary or press cancel to abort",
  "Failed to get revision information, please edit manually.\n\n": "Failed to get revision information, please edit manually.\n\n",
  "The %s button has been automatically clicked. Please wait for the next page to load.": "The %s button has been automatically clicked. Please wait for the next page to load.",
  "Could not find button %s. Please check the settings in your javascript file.": "Could not find button %s. Please check the settings in your javascript file.",
  "Open full-size image": "Open full-size image",
  zxy: "zxy",
  autoedit_version: "np20140416"
};
const popupNoTranslation = /* @__PURE__ */ new Set();
const cleanupLegacyNoTranslationStorage = () => {
  localStorage.removeItem("popupNoTranslation");
};
const simplePrintf = (str, subs) => {
  if (!str) {
    return str;
  }
  const ret = [];
  const parts = str.split(/(%s|\$[0-9]+)/);
  let i = 0;
  for (let k = 0; k + 1 < parts.length; k += 2) {
    ret.push(parts[k]);
    const cmd = parts[k + 1];
    if (cmd === "%s") {
      if (i < subs.length) {
        ret.push(subs[i]);
      } else {
        ret.push(cmd);
      }
      ++i;
    } else {
      const j = parseInt(cmd.replace("$", ""), 10) - 1;
      if (j > -1 && j < subs.length) {
        ret.push(subs[j]);
      } else {
        ret.push(cmd);
      }
    }
  }
  ret.push(parts[parts.length - 1]);
  return ret.join("");
};
const popupString = (str) => {
  const override = window.popupStrings?.[str];
  if (override) {
    return override;
  }
  const translated = popupStrings[str];
  if (translated) {
    return translated;
  }
  const english = englishStrings[str];
  if (english) {
    return english;
  }
  if (!popupNoTranslation.has(str) && !str.includes("&autoimpl=np20140416&actoken=") && !str.endsWith("Hint")) {
    popupNoTranslation.add(str);
    console.info("popupNoTranslation", popupNoTranslation);
  }
  return str;
};
const tprintf = (str, subs) => {
  const subList = Array.isArray(subs) ? subs : [subs];
  return simplePrintf(popupString(str), subList);
};

const nsState = {
  specialId: -1,
  mainspaceId: 0,
  imageId: 6,
  userId: 2,
  usertalkId: 3,
  categoryId: 14,
  templateId: 10,
  interwiki: void 0,
  re: {
    interwiki: null,
    redirect: null
  }
};
const upcaseFirst = (str) => str.charAt(0).toUpperCase() + str.substring(1);
const setNamespaces = () => {
  nsState.specialId = -1;
  nsState.mainspaceId = 0;
  nsState.imageId = 6;
  nsState.userId = 2;
  nsState.usertalkId = 3;
  nsState.categoryId = 14;
  nsState.templateId = 10;
};
const setRedirs = () => {
  const r = "redirect";
  const R = "REDIRECT";
  const redirLists = {
    ar: [R, "\u062A\u062D\u0648\u064A\u0644"],
    be: [r, "\u043F\u0435\u0440\u0430\u043D\u0430\u043A\u0456\u0440\u0430\u0432\u0430\u043D\u044C\u043D\u0435"],
    bg: [r, "\u043F\u0440\u0435\u043D\u0430\u0441\u043E\u0447\u0432\u0430\u043D\u0435", "\u0432\u0438\u0436"],
    bs: [r, "Preusmjeri", "preusmjeri", "PREUSMJERI"],
    bn: [R, "\u09AA\u09C1\u09A8\u09B0\u09CD\u09A8\u09BF\u09B0\u09CD\u09A6\u09C7\u09B6"],
    cs: [R, "P\u0158ESM\u011ARUJ"],
    cy: [r, "ail-cyfeirio"],
    de: [R, "WEITERLEITUNG"],
    el: [R, "\u0391\u039D\u0391\u039A\u0391\u03A4\u0395\u03A5\u0398\u03A5\u039D\u03A3\u0397"],
    eo: [R, "ALIDIREKTU", "ALIDIREKTI"],
    es: [R, "REDIRECCI\xD3N"],
    et: [r, "suuna"],
    ga: [r, "athsheoladh"],
    gl: [r, "REDIRECCI\xD3N", "REDIRECIONAMENTO"],
    he: [R, "\u05D4\u05E4\u05E0\u05D9\u05D4"],
    hu: [R, "\xC1TIR\xC1NY\xCDT\xC1S"],
    is: [r, "tilv\xEDsun", "TILV\xCDSUN"],
    it: [R, "RINVIA", "Rinvia"],
    ja: [R, "\u8EE2\u9001"],
    mk: [r, "\u043F\u0440\u0435\u043D\u0430\u0441\u043E\u0447\u0443\u0432\u0430\u045A\u0435", "\u0432\u0438\u0434\u0438"],
    nds: [r, "wiederleiden"],
    "nds-nl": [R, "DEURVERWIEZING", "DUURVERWIEZING"],
    nl: [R, "DOORVERWIJZING"],
    nn: [r, "omdiriger"],
    pl: [R, "PATRZ", "PRZEKIERUJ", "TAM"],
    pt: [R, "redir"],
    ru: [R, "\u041F\u0415\u0420\u0415\u041D\u0410\u041F\u0420\u0410\u0412\u041B\u0415\u041D\u0418\u0415", "\u041F\u0415\u0420\u0415\u041D\u0410\u041F\u0420"],
    sk: [r, "presmeruj"],
    sr: [r, "\u041F\u0440\u0435\u0443\u0441\u043C\u0435\u0440\u0438", "\u043F\u0440\u0435\u0443\u0441\u043C\u0435\u0440\u0438", "\u041F\u0420\u0415\u0423\u0421\u041C\u0415\u0420\u0418", "Preusmeri", "preusmeri", "PREUSMERI"],
    tt: [R, "y\xFCn\xE4lt\xFC", "\u043F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435", "\u043F\u0435\u0440\u0435\u043D\u0430\u043F\u0440"],
    uk: [R, "\u041F\u0415\u0420\u0415\u041D\u0410\u041F\u0420\u0410\u0412\u041B\u0415\u041D\u041D\u042F", "\u041F\u0415\u0420\u0415\u041D\u0410\u041F\u0420"],
    vi: [r, "\u0111\u1ED5i"],
    yi: [R, "\u05D5\u05D5\u05D9\u05D9\u05D8\u05E2\u05E8\u05E4\u05D9\u05E8\u05DF"],
    zh: [R, "\u91CD\u5B9A\u5411"]
  };
  const redirList = redirLists[mw.config.get("wgContentLanguage")] ?? [r, R];
  nsState.re.redirect = RegExp(`^\\s*[#](${redirList.join("|")}).*?\\[{2}([^\\|\\]]*)(|[^\\]]*)?\\]{2}\\s*(.*)`, "i");
};
const setInterwiki = () => {
  const lang = mw.config.get("wgContentLanguage");
  if (lang === "zh") {
    nsState.interwiki = "en|ja";
  } else if (lang === "en") {
    nsState.interwiki = "zh|ja";
  } else if (lang === "ja") {
    nsState.interwiki = "zh|en";
  }
  nsState.re.interwiki = RegExp(`^${String(nsState.interwiki)}:`);
};
const nsRe = (namespaceId) => {
  const imageNamespaceVariants = [];
  for (const [localizedNamespaceLc, id] of Object.entries(mw.config.get("wgNamespaceIds"))) {
    if (id !== namespaceId) {
      continue;
    }
    const variant = upcaseFirst(localizedNamespaceLc);
    imageNamespaceVariants.push(mw.util.escapeRegExp(variant).split(" ").join("[ _]"));
    imageNamespaceVariants.push(mw.util.escapeRegExp(encodeURI(variant)));
  }
  return `(?:${imageNamespaceVariants.join("|")})`;
};
const nsReImage = () => nsRe(nsState.imageId);

const titleOptionDefaults = {
  popupOnlyArticleLinks: true,
  popupAllDabsStubs: false
};
const wiki = {
  titlebase: "",
  misc: {
    decodeExtras: null
  },
  re: {
    basenames: null,
    urlNoPopup: null,
    main: null,
    contribs: null,
    email: null,
    backlinks: null,
    specialdiff: null,
    ipUser: null,
    disambig: null,
    stub: null,
    image: null,
    category: null,
    oldid: null,
    diff: null
  },
  getOption: (name) => titleOptionDefaults[name]
};
const stripDisplayAlias = (decoded) => {
  const s = decoded.toString();
  const hash = s.indexOf("#");
  const title = hash < 0 ? s : s.substring(0, hash);
  const pipe = title.indexOf("|");
  if (pipe < 0) {
    return decoded;
  }
  const stripped = title.substring(0, pipe).replace(/[_ ]*$/, "");
  return hash < 0 ? stripped : stripped + s.substring(hash);
};
const assume$3 = (value) => value;
const parenSplit = (str, re) => str.split(re);
class Stringwrapper {
  constructor() {
    this.value = null;
  }
  indexOf(x) {
    return this.toString().indexOf(x);
  }
  toString() {
    return this.value;
  }
  parenSplit(x) {
    return parenSplit(this.toString(), x);
  }
  substring(x, y) {
    if (typeof y === "undefined") {
      return this.toString().substring(x);
    }
    return this.toString().substring(x, y);
  }
  split(x) {
    return this.toString().split(x);
  }
  replace(x, y) {
    return this.toString().replace(x, y);
  }
}
const _Title = class _Title extends Stringwrapper {
  constructor(val) {
    super();
    this.anchor = "";
    this.decodeEscapes = (txt) => {
      const split = parenSplit(txt.toString(), /((?:[%][0-9A-Fa-f]{2})+)/);
      const len = split.length;
      if (len === 1) {
        return split[0].replace(/%(?![0-9a-fA-F][0-9a-fA-F])/g, "%25");
      }
      for (let i = 1; i < len; i = i + 2) {
        split[i] = decodeURIComponent(split[i]);
      }
      return split.join("");
    };
    this.setUtf(val);
  }
  toString(omitAnchor) {
    return String(this.value) + (!omitAnchor && this.anchor ? `#${this.anchorString()}` : "");
  }
  anchorString() {
    if (!this.anchor) {
      return "";
    }
    const split = parenSplit(this.anchor, /((?:[.][0-9A-F]{2})+)/);
    const len = split.length;
    let value;
    for (let j = 1; j < len; j += 2) {
      value = split[j].split(".").join("%");
      try {
        value = decodeURIComponent(value);
      } catch {
      }
      split[j] = value.split("_").join(" ");
    }
    return split.join("");
  }
  urlAnchor() {
    const split = parenSplit(this.anchor, "/((?:[%][0-9A-F]{2})+)/");
    const len = split.length;
    for (let j = 1; j < len; j += 2) {
      split[j] = split[j].split("%").join(".");
    }
    return split.join("");
  }
  anchorFromUtf(str) {
    this.anchor = encodeURIComponent(str.split(" ").join("_")).split("%3A").join(":").split("'").join("%27").split("%").join(".");
  }
  decodeNasties(txt) {
    try {
      let ret = decodeURI(this.decodeEscapes(txt));
      ret = ret.replace(/[_ ]*$/, "");
      return ret;
    } catch {
      return txt;
    }
  }
  hintValue() {
    if (!this.value) {
      return "";
    }
    return safeDecodeURI(this.value);
  }
  toUserName(withNs) {
    if (this.namespaceId() !== nsState.userId && this.namespaceId() !== nsState.usertalkId) {
      this.value = null;
      return;
    }
    this.value = (withNs ? `${mw.config.get("wgFormattedNamespaces")[nsState.userId]}:` : "") + this.stripNamespace().split("/")[0];
  }
  userName(withNs) {
    const t = new _Title(this.value);
    t.toUserName(withNs);
    if (t.value) {
      return t;
    }
    return null;
  }
  toTalkPage() {
    if (this.value === null) {
      return null;
    }
    const namespaceId = this.namespaceId();
    if (namespaceId >= 0 && namespaceId % 2 === 0) {
      const localizedNamespace = mw.config.get("wgFormattedNamespaces")[namespaceId + 1];
      if (typeof localizedNamespace !== "undefined") {
        if (localizedNamespace === "") {
          this.value = this.stripNamespace();
        } else {
          this.value = `${localizedNamespace.split(" ").join("_")}:${this.stripNamespace()}`;
        }
        return this.value;
      }
    }
    this.value = null;
    return null;
  }
  namespace() {
    return mw.config.get("wgFormattedNamespaces")[this.namespaceId()];
  }
  namespaceId() {
    try {
      const n = assume$3(this.value).indexOf(":");
      if (n < 0) {
        return 0;
      }
      const namespaceId = mw.config.get("wgNamespaceIds")[assume$3(this.value).substring(0, n).split(" ").join("_").toLowerCase()];
      if (typeof namespaceId === "undefined") {
        return 0;
      }
      return namespaceId;
    } catch (e) {
      console.error(e, this);
      return 0;
    }
  }
  talkPage() {
    const t = new _Title(this.value);
    t.toTalkPage();
    if (t.value) {
      return t;
    }
    return null;
  }
  isTalkPage() {
    if (this.talkPage() === null) {
      return true;
    }
    return false;
  }
  toArticleFromTalkPage() {
    if (this.value === null) {
      return null;
    }
    const namespaceId = this.namespaceId();
    if (namespaceId >= 0 && namespaceId % 2 === 1) {
      const localizedNamespace = mw.config.get("wgFormattedNamespaces")[namespaceId - 1];
      if (typeof localizedNamespace !== "undefined") {
        if (localizedNamespace === "") {
          this.value = this.stripNamespace();
        } else {
          this.value = `${localizedNamespace.split(" ").join("_")}:${this.stripNamespace()}`;
        }
        return this.value;
      }
    }
    this.value = null;
    return null;
  }
  articleFromTalkPage() {
    const t = new _Title(this.value);
    t.toArticleFromTalkPage();
    if (t.value) {
      return t;
    }
    return null;
  }
  articleFromTalkOrArticle() {
    const t = new _Title(this.value);
    if (t.toArticleFromTalkPage()) {
      return t;
    }
    return this;
  }
  isIpUser() {
    return assume$3(wiki.re.ipUser).test(String(this.userName()));
  }
  stripNamespace() {
    const n = assume$3(this.value).indexOf(":");
    if (n < 0) {
      return assume$3(this.value);
    }
    const namespaceId = this.namespaceId();
    if (namespaceId === nsState.mainspaceId) {
      return assume$3(this.value);
    }
    return assume$3(this.value).substring(n + 1);
  }
  setUtf(value) {
    if (!value) {
      this.value = "";
      return;
    }
    const anch = value.indexOf("#");
    if (anch < 0) {
      this.value = value.split("_").join(" ");
      this.anchor = "";
      return;
    }
    this.value = value.substring(0, anch).split("_").join(" ");
    this.anchor = value.substring(anch + 1);
    this.ns = null;
  }
  setUrl(urlfrag) {
    const anch = urlfrag.indexOf("#");
    this.value = safeDecodeURI(urlfrag.substring(0, anch));
    this.anchor = this.value.substring(anch + 1);
  }
  append(x) {
    this.setUtf(String(this.value) + x);
  }
  urlString(_x) {
    const x = _x ?? {};
    let v = this.toString(true);
    if (!x.omitAnchor && this.anchor) {
      v += `#${this.urlAnchor()}`;
    }
    if (!x.keepSpaces) {
      v = v.split(" ").join("_");
    }
    return encodeURI(v).split("&").join("%26").split("?").join("%3F").split("+").join("%2B");
  }
  removeAnchor() {
    return new _Title(this.toString(true));
  }
  toUrl() {
    return wiki.titlebase + this.urlString();
  }
  fromURL(_h) {
    if (typeof _h !== "string") {
      this.value = null;
      return this;
    }
    let h = _h;
    const splitted = h.split("?");
    splitted[0] = splitted[0].split("&").join("%26");
    h = splitted.join("?");
    const contribs = assume$3(wiki.re.contribs).exec(h);
    if (contribs) {
      if (contribs[1] === "title=") {
        contribs[3] = contribs[3].split("+").join(" ");
      }
      const u = new _Title(contribs[3]);
      this.setUtf(stripDisplayAlias(this.decodeNasties(`${mw.config.get("wgFormattedNamespaces")[nsState.userId]}:${u.stripNamespace()}`)));
      return this;
    }
    const email = assume$3(wiki.re.email).exec(h);
    if (email) {
      this.setUtf(stripDisplayAlias(this.decodeNasties(`${mw.config.get("wgFormattedNamespaces")[nsState.userId]}:${new _Title(email[3]).stripNamespace()}`)));
      return this;
    }
    const backlinks = assume$3(wiki.re.backlinks).exec(h);
    if (backlinks) {
      this.setUtf(stripDisplayAlias(this.decodeNasties(new _Title(backlinks[3]))));
      return this;
    }
    const specialdiff = assume$3(wiki.re.specialdiff).exec(h);
    if (specialdiff) {
      this.setUtf(this.decodeNasties(new _Title(`${mw.config.get("wgFormattedNamespaces")[nsState.specialId]}:Diff`)));
      return this;
    }
    const m = assume$3(wiki.re.main).exec(h);
    if (m === null) {
      this.value = null;
    } else {
      const fromBotInterface = /[?](.+[&])?title=/.test(h);
      if (fromBotInterface) {
        m[2] = m[2].split("+").join("_");
      }
      const extracted = m[2] + (m[3] ? `#${m[3]}` : "");
      this.setUtf(stripDisplayAlias(this.decodeNasties(extracted)));
    }
    return this;
  }
  fromAnchor(a) {
    if (!a) {
      this.value = null;
      return this;
    }
    return this.fromURL(a.href);
  }
  fromWikiText(_txt) {
    let txt = _txt;
    txt = myDecodeURI(txt);
    this.setUtf(txt);
    return this;
  }
};
_Title.fromURL = (h) => new _Title().fromURL(h);
_Title.fromAnchor = (a) => new _Title().fromAnchor(a);
_Title.fromWikiText = (txt) => new _Title().fromWikiText(txt);
let Title = _Title;
const parseParams = (_url) => {
  let url = _url;
  const specialDiff = assume$3(wiki.re.specialdiff).exec(url);
  if (specialDiff) {
    const split = specialDiff[1].split("/");
    if (split.length === 1) {
      return {
        oldid: split[0],
        diff: "prev"
      };
    } else if (split.length === 2) {
      return {
        oldid: split[0],
        diff: split[1]
      };
    }
  }
  const ret = {};
  if (!url.includes("?")) {
    return ret;
  }
  url = url.split("#")[0];
  const s = url.split("?").slice(1).join();
  const t = s.split("&");
  for (const pair of t) {
    const z = pair.split("=");
    z.push(null);
    ret[assume$3(z[0])] = z[1];
  }
  if (ret.diff && typeof ret.oldid === "undefined") {
    ret.oldid = "prev";
  }
  if (ret.oldid && (ret.oldid === "prev" || ret.oldid === "next" || ret.oldid === "cur")) {
    const helper = ret.diff;
    ret.diff = ret.oldid;
    ret.oldid = helper;
  }
  return ret;
};
const myDecodeURI = (str) => {
  let ret;
  try {
    ret = decodeURI(str.toString());
  } catch {
    return str;
  }
  const extras = wiki.misc.decodeExtras;
  for (let i = 0; i < (extras?.length ?? 0); ++i) {
    const from = assume$3(extras)[i].from;
    const to = assume$3(extras)[i].to;
    ret = ret.split(from).join(to);
  }
  return ret;
};
const safeDecodeURI = (str) => {
  const ret = myDecodeURI(str);
  return ret || str;
};
const isDisambig = (data, article) => {
  if (!wiki.getOption("popupAllDabsStubs") && article.namespace()) {
    return false;
  }
  return !article.isTalkPage() && assume$3(wiki.re.disambig).test(data);
};
const stubCount = (data, article) => {
  if (!wiki.getOption("popupAllDabsStubs") && article.namespace()) {
    return false;
  }
  let sectStub = 0;
  let realStub = 0;
  if (assume$3(wiki.re.stub).test(data)) {
    const s = parenSplit(data, assume$3(wiki.re.stub));
    for (let i = 1; i < s.length; i = i + 2) {
      if (s[i]) {
        ++sectStub;
      } else {
        ++realStub;
      }
    }
  }
  return {
    real: realStub,
    sect: sectStub
  };
};
const isValidImageName = (str) => str.indexOf("{") === -1;
const isInStrippableNamespace = (article) => article.namespaceId() !== 0;
const isInMainNamespace = (article) => article.namespaceId() === 0;
const anchorContainsImage = (a) => {
  if (a === null) {
    return false;
  }
  const kids = a.childNodes;
  for (const kid of kids) {
    if (kid.nodeName === "IMG") {
      return true;
    }
  }
  return false;
};
const isPopupLink = (a) => {
  if (!markNopopupSpanLinks.done) {
    markNopopupSpanLinks();
  }
  if (a.inNopopupSpan) {
    return false;
  }
  if (a.onmousedown || a.getAttribute("nopopup")) {
    return false;
  }
  const h = a.href;
  if (h === `${document.location.href}#`) {
    return false;
  }
  if (!assume$3(wiki.re.basenames).test(h)) {
    return false;
  }
  if (!assume$3(wiki.re.urlNoPopup).test(h)) {
    return true;
  }
  return (assume$3(wiki.re.email).test(h) || assume$3(wiki.re.contribs).test(h) || assume$3(wiki.re.backlinks).test(h) || assume$3(wiki.re.specialdiff).test(h)) && !h.includes("&limit=");
};
const markNopopupSpanLinks = () => {
  if (!wiki.getOption("popupOnlyArticleLinks")) {
    fixVectorMenuPopups();
  }
  const s = $(".nopopups").toArray();
  for (const container of s) {
    const as = container.getElementsByTagName("a");
    for (const a of as) {
      a.inNopopupSpan = true;
    }
  }
  markNopopupSpanLinks.done = true;
};
const fixVectorMenuPopups = () => {
  $("div.vectorMenu h3:first a:first, div.vector-menu h3:first a:first, nav.vector-menu h3:first a:first").prop("inNopopupSpan", true);
};

const popupFilterPageSize = (data) => formatBytes(data.length);
const popupFilterCountLinks = (data) => {
  const num = countLinks(data);
  return `${num}&nbsp;${num !== 1 ? popupString("wikiLinks") : popupString("wikiLink")}`;
};
const popupFilterCountImages = (data) => {
  const num = countImages(data);
  return `${num}&nbsp;${num !== 1 ? popupString("images") : popupString("image")}`;
};
const popupFilterCountCategories = (data) => {
  const num = countCategories(data);
  return `${num}&nbsp;${num !== 1 ? popupString("categories") : popupString("category")}`;
};
const popupFilterLastModified = (_data, download) => {
  const lastmod = download.lastModified;
  const age = moment(lastmod);
  if (lastmod && getValueOf("popupLastModified")) {
    return tprintf("%s old", [formatAge(age)]).replace(/ /g, "&nbsp;");
  }
  return "";
};
const popupFilterWikibaseItem = (_data, download) => {
  if (!download.wikibaseItem || !download.wikibaseRepo) {
    return "";
  }
  return tprintf('<a href="%s">%s</a>', [
    download.wikibaseRepo.replace(/\$1/g, download.wikibaseItem),
    download.wikibaseItem
  ]);
};
const formatAge = (age) => {
  const now = moment();
  const isBefore = age.isBefore(now);
  const monthsHave31Days = [0, 2, 4, 6, 7, 9, 11];
  let year = isBefore ? now.year() - age.year() : age.year() - now.year(), month = isBefore ? now.month() - age.month() : age.month() - now.month(), day = isBefore ? now.date() - age.date() : age.date() - now.date(), hour = isBefore ? now.hour() - age.hour() : age.hour() - now.hour(), minute = isBefore ? now.minute() - age.minute() : age.minute() - now.minute(), second = isBefore ? now.second() - age.second() : age.second() - now.second();
  if (second < 0) {
    minute--;
    second += 60;
  }
  if (minute < 0) {
    hour--;
    minute += 60;
  }
  if (hour < 0) {
    day--;
    hour += 24;
  }
  if (day < 0) {
    month--;
    if (monthsHave31Days.includes((isBefore ? age : now).month())) {
      day += 31;
    } else if ((isBefore ? age : now).month() === 1) {
      if ((isBefore ? age : now).year() % 4 === 0) {
        day += 29;
      } else {
        day += 28;
      }
    } else {
      day += 30;
    }
  }
  if (month < 0) {
    year--;
    month += 12;
  }
  let result = "";
  if (year > 0) {
    result += addunit(year, "year");
  }
  if (month > 0) {
    result += addunit(month, "month");
  } else if (result !== "") {
    result += addunit(0, "month");
  }
  if (day > 0) {
    result += addunit(day, "day");
  } else if (result !== "") {
    result += addunit(0, "day");
  }
  if (hour > 0) {
    result += addunit(hour, "hour");
  } else if (result !== "") {
    result += addunit(0, "hour");
  }
  if (minute > 0) {
    result += addunit(minute, "minute");
  } else if (result !== "") {
    result += addunit(0, "minute");
  }
  if (second > 0) {
    result += addunit(second, "second");
  } else if (result !== "") {
    result += addunit(0, "second");
  }
  return result.replace(/(\d) /g, "$1");
};
const addunit = (num, str) => `${num} ${num !== 1 ? popupString(`${str}s`) : popupString(str)}`;
const runPopupFilters = (list, data, download) => {
  const ret = [];
  for (const filter of list) {
    if (filter && typeof filter === "function") {
      const owner = download.owner;
      const s = filter(data, download, owner?.article);
      if (s) {
        ret.push(s);
      }
    }
  }
  return ret;
};
const getPageInfo = (data, download) => {
  if (!data || data.length === 0) {
    return popupString("Empty page");
  }
  const popupFilters = getValueOf("popupFilters") ?? [];
  const extraPopupFilters = getValueOf("extraPopupFilters") ?? [];
  const pageInfoArray = runPopupFilters(popupFilters.concat(extraPopupFilters), data, download);
  let pageInfo = pageInfoArray.join(popupString("comma"));
  if (pageInfo !== "") {
    pageInfo = upcaseFirst(pageInfo);
  }
  return pageInfo;
};
const countLinks = (wikiText) => wikiText.split("[[").length - 1;
const countImages = (wikiText) => (parenSplit(wikiText, wiki.re.image).length - 1) / (wiki.re.imageBracketCount + 1);
const countCategories = (wikiText) => (parenSplit(wikiText, wiki.re.category).length - 1) / (wiki.re.categoryBracketCount + 1);
const popupFilterStubDetect = (data, _download, article) => {
  const counts = stubCount(data, article);
  if (counts && counts.real) {
    return popupString("stub");
  }
  if (counts && counts.sect) {
    return popupString("section stub");
  }
  return "";
};
const popupFilterDisambigDetect = (data, _download, article) => {
  if (!getValueOf("popupAllDabsStubs") && article.namespace()) {
    return "";
  }
  return isDisambig(data, article) ? popupString("disambig") : "";
};
const formatBytes = (num) => num > 949 ? `${Math.round(num / 100) / 10}${popupString("kB")}` : `${num}&nbsp;${popupString("bytes")}`;

const optionStore = {};
const optionDefault = {};
const newOption = (x, def) => {
  optionDefault[x] = def;
};
const setDefault = (x, def) => {
  newOption(x, def);
};
const defaultize = (x) => {
  if (optionStore[x] === null || typeof optionStore[x] === "undefined") {
    const w = window;
    if (typeof w[x] !== "undefined") {
      optionStore[x] = w[x];
    } else {
      optionStore[x] = optionDefault[x];
    }
  }
};
const getValueOf = (varName) => {
  defaultize(varName);
  return optionStore[varName];
};
const setOptions = () => {
  const groups = mw.config.get("wgUserGroups");
  const userIsSysop = !!groups && groups.includes("sysop");
  newOption("popupDelay", 0.5);
  newOption("popupHideDelay", 0.5);
  newOption("simplePopups", false);
  newOption("popupStructure", "shortmenus");
  newOption("popupActionsMenu", true);
  newOption("popupSetupMenu", true);
  newOption("popupAdminLinks", userIsSysop);
  newOption("popupShortcutKeys", false);
  newOption("popupHistoricalLinks", true);
  newOption("popupOnlyArticleLinks", true);
  newOption("removeTitles", true);
  newOption("popupMaxWidth", 350);
  newOption("popupSimplifyMainLink", true);
  newOption("popupAppendRedirNavLinks", true);
  newOption("popupTocLinks", false);
  newOption("popupSubpopups", true);
  newOption("popupDragHandle", false);
  newOption("popupLazyPreviews", true);
  newOption("popupLazyDownloads", true);
  newOption("popupAllDabsStubs", false);
  newOption("popupDebugging", false);
  newOption("popupActiveNavlinks", true);
  newOption("popupModifier", false);
  newOption("popupModifierAction", "enable");
  newOption("popupDraggable", true);
  newOption("popupReview", false);
  newOption("popupLocale", false);
  newOption("popupDateTimeFormatterOptions", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  newOption("popupDateFormatterOptions", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  newOption("popupTimeFormatterOptions", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  newOption("popupImages", true);
  newOption("imagePopupsForImages", true);
  newOption("popupNeverGetThumbs", false);
  newOption("popupThumbAction", "imagepage");
  newOption("popupImageSize", 60);
  newOption("popupImageSizeLarge", 200);
  newOption("popupFixRedirs", false);
  newOption("popupRedirAutoClick", "wpDiff");
  newOption("popupFixDabs", false);
  newOption("popupDabsAutoClick", "wpDiff");
  newOption("popupRevertSummaryPrompt", false);
  newOption("popupMinorReverts", false);
  newOption("popupRedlinkRemoval", false);
  newOption("popupRedlinkAutoClick", "wpDiff");
  newOption("popupWatchDisambiggedPages", null);
  newOption("popupWatchRedirredPages", null);
  newOption("popupDabWiktionary", "last");
  newOption("popupNavLinks", true);
  newOption("popupNavLinkSeparator", " &sdot; ");
  newOption("popupLastEditLink", true);
  newOption("popupEditCounterTool", "supercount");
  newOption("popupEditCounterUrl", "");
  newOption("popupPreviews", true);
  newOption("popupSummaryData", true);
  newOption("popupMaxPreviewSentences", 5);
  newOption("popupMaxPreviewCharacters", 600);
  newOption("popupLastModified", true);
  newOption("popupPreviewKillTemplates", true);
  newOption("popupPreviewRawTemplates", true);
  newOption("popupPreviewFirstParOnly", true);
  newOption("popupPreviewCutHeadings", true);
  newOption("popupPreviewButton", false);
  newOption("popupPreviewButtonEvent", "click");
  newOption("popupPreviewDiffs", true);
  newOption("popupDiffMaxLines", 100);
  newOption("popupDiffContextLines", 2);
  newOption("popupDiffContextCharacters", 40);
  newOption("popupDiffDates", true);
  newOption("popupDiffDatePrinter", "toLocaleString");
  newOption("popupReviewedSummary", popupString("defaultpopupReviewedSummary"));
  newOption("popupFixDabsSummary", popupString("defaultpopupFixDabsSummary"));
  newOption("popupExtendedRevertSummary", popupString("defaultpopupExtendedRevertSummary"));
  newOption("popupRevertSummary", popupString("defaultpopupRevertSummary"));
  newOption("popupRevertToPreviousSummary", popupString("defaultpopupRevertToPreviousSummary"));
  newOption("popupQueriedRevertSummary", popupString("defaultpopupQueriedRevertSummary"));
  newOption("popupQueriedRevertToPreviousSummary", popupString("defaultpopupQueriedRevertToPreviousSummary"));
  newOption("popupFixRedirsSummary", popupString("defaultpopupFixRedirsSummary"));
  newOption("popupRedlinkSummary", popupString("defaultpopupRedlinkSummary"));
  newOption("popupRmDabLinkSummary", popupString("defaultpopupRmDabLinkSummary"));
  newOption("popupHistoryLimit", 50);
  newOption("popupFilters", [popupFilterStubDetect, popupFilterDisambigDetect, popupFilterPageSize, popupFilterCountLinks, popupFilterCountImages, popupFilterCountCategories, popupFilterLastModified, popupFilterWikibaseItem]);
  newOption("extraPopupFilters", []);
  newOption("popupOnEditSelection", "cursor");
  newOption("popupPreviewHistory", true);
  newOption("popupImageLinks", true);
  newOption("popupCategoryMembers", true);
  newOption("popupUserInfo", true);
  newOption("popupHistoryPreviewLimit", 25);
  newOption("popupContribsPreviewLimit", 25);
  newOption("popupRevDelUrl", "//en.wikipedia.org/wiki/Wikipedia:Revision_deletion");
  newOption("popupShowGender", true);
  newOption("popupNewWindows", false);
  newOption("popupLinksNewWindow", {
    lastContrib: true,
    sinceMe: true
  });
  newOption("popupDabRegexp", "disambiguation\\}\\}|\\{\\{\\s*(d(ab|isamb(ig(uation)?)?)|(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index))\\s*(\\|[^}]*)?\\}\\}|is a .*disambiguation.*page");
  newOption("popupAnchorRegexp", "anchors?");
  newOption("popupStubRegexp", "(sect)?stub[}][}]|This .*-related article is a .*stub");
  newOption("popupImageVarsRegexp", "image|image_(?:file|skyline|name|flag|seal)|cover|badge|logo");
};
const shouldShowNonSimple = (a) => !getValueOf("simplePopups") || a.simpleNoMore;
const shouldShow = (a, option) => {
  if (shouldShowNonSimple(a)) {
    return getValueOf(option);
  }
  const w = window;
  return typeof w[option] !== "undefined" && w[option];
};

const siteState = {
  hostname: "",
  wikimedia: false,
  wikia: false,
  isLocal: false,
  commons: null,
  lang: "",
  sitebase: "",
  articlePath: "",
  botInterfacePath: "",
  APIPath: "",
  titlebase: "",
  wikibase: "",
  apiwikibase: "",
  articlebase: "",
  commonsbase: "",
  apicommonsbase: "",
  specialpagealiases: []
};
const userState = { canReview: false };
const setSiteInfo = () => {
  if (window.popupLocalDebug) {
    siteState.hostname = "en.wikipedia.org";
  } else {
    siteState.hostname = location.hostname;
  }
  siteState.wikimedia = /(?:^|[.])(?:wiki(?:[pm]edia|source|books|news|quote|versity|species|voyage|data)|metawiki|wiktionary|mediawiki)[.]org$/.test(siteState.hostname);
  siteState.wikia = /[.]wikia[.]com$/i.test(siteState.hostname);
  siteState.isLocal = siteState.hostname.startsWith("localhost");
  siteState.commons = siteState.wikimedia && siteState.hostname !== "commons.wikimedia.org" ? "commons.wikimedia.org" : null;
  siteState.lang = mw.config.get("wgContentLanguage");
  const port = location.port ? `:${location.port}` : "";
  siteState.sitebase = siteState.hostname + port;
};
const setTitleBase = () => {
  const protocol = window.popupLocalDebug ? "http:" : location.protocol;
  siteState.articlePath = mw.config.get("wgArticlePath").replace(/\/\$1/, "");
  siteState.botInterfacePath = mw.config.get("wgScript");
  siteState.APIPath = `${mw.config.get("wgScriptPath")}/api.php`;
  const titletail = `${siteState.botInterfacePath}?title=`;
  siteState.titlebase = `${protocol}//${siteState.sitebase}${titletail}`;
  siteState.wikibase = `${protocol}//${siteState.sitebase}${siteState.botInterfacePath}`;
  siteState.apiwikibase = `${protocol}//${siteState.sitebase}${siteState.APIPath}`;
  siteState.articlebase = `${protocol}//${siteState.sitebase}${siteState.articlePath}`;
  siteState.commonsbase = `${protocol}//${String(siteState.commons)}${siteState.botInterfacePath}`;
  siteState.apicommonsbase = `${protocol}//${String(siteState.commons)}${siteState.APIPath}`;
  wiki.titlebase = siteState.titlebase;
  const esc = mw.util.escapeRegExp;
  wiki.re.basenames = RegExp(`^(${esc(siteState.titlebase)}|${esc(siteState.articlebase)})`);
};
const setMainRegex = () => {
  const reStart = "[^:]*://";
  const esc = mw.util.escapeRegExp;
  let preTitles = `(?:${esc(mw.config.get("wgScript"))}|${esc(mw.config.get("wgScriptPath"))}/(?:index[.]php|wiki[.]phtml))`;
  preTitles += `[?]title=|${esc(`${siteState.articlePath}/`)}`;
  const reEnd = `(${preTitles})([^&?#]*)[^#]*(?:#(.+))?`;
  wiki.re.main = RegExp(reStart + esc(siteState.sitebase) + reEnd);
};
const buildSpecialPageGroup = (specialPageObj) => {
  const variants = [];
  const esc = mw.util.escapeRegExp;
  variants.push(esc(specialPageObj.realname), esc(encodeURI(specialPageObj.realname)));
  for (const alias of specialPageObj.aliases) {
    variants.push(esc(alias), esc(encodeURI(alias)));
  }
  return variants.join("|");
};
const setRegexps = () => {
  setMainRegex();
  const sp = nsRe(nsState.specialId);
  wiki.re.urlNoPopup = RegExp(`((title=|/)${sp}(?:%3A|:)|section=[0-9]|^#$)`);
  for (const specialpage of siteState.specialpagealiases) {
    if (specialpage.realname === "Contributions") {
      wiki.re.contribs = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})(&target=|/|/${nsRe(nsState.userId)}:)(.*)`, "i");
    } else if (specialpage.realname === "Diff") {
      wiki.re.specialdiff = RegExp(`/${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})/([^?#]*)`, "i");
    } else if (specialpage.realname === "Emailuser") {
      wiki.re.email = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})(&target=|/|/(?:${nsRe(nsState.userId)}:)?)(.*)`, "i");
    } else if (specialpage.realname === "Whatlinkshere") {
      wiki.re.backlinks = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${buildSpecialPageGroup(specialpage)})(&target=|/)([^&]*)`, "i");
    }
  }
  const im = nsReImage();
  wiki.re.image = RegExp(`(^|\\[\\[)${im}: *([^|\\]]*[^|\\] ])([^0-9\\]]*([0-9]+) *px)?|(?:\\n *[|]?|[|]) *(${getValueOf("popupImageVarsRegexp")}) *= *(?:\\[\\[ *)?(?:${im}:)?([^|]*?)(?:\\]\\])? *[|]? *\\n`, "img");
  wiki.re.imageBracketCount = 6;
  wiki.re.category = RegExp(`\\[\\[${nsRe(nsState.categoryId)}: *([^|\\]]*[^|\\] ]) *`, "i");
  wiki.re.categoryBracketCount = 1;
  wiki.re.ipUser = RegExp("^(?::(?::|(?::[0-9A-Fa-f]{1,4}){1,7})|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6}::|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){7})|(((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9]))$");
  wiki.re.stub = RegExp(getValueOf("popupStubRegexp"), "im");
  wiki.re.disambig = RegExp(getValueOf("popupDabRegexp"), "im");
  wiki.re.oldid = /[?&]oldid=([^&]*)/;
  wiki.re.diff = /[?&]diff=([^&]*)/;
};
const fetchSpecialPageNames = async () => {
  const params = {
    action: "query",
    meta: "siteinfo",
    siprop: "specialpagealiases",
    formatversion: 2,
    uselang: "content",
    maxage: 3600
  };
  const data = await getMwApi().get(params);
  siteState.specialpagealiases = data.query.specialpagealiases;
};
const setUserInfo = async () => {
  const params = {
    action: "query",
    list: "users",
    ususers: mw.config.get("wgUserName") ?? "",
    usprop: "rights"
  };
  userState.canReview = false;
  if (getValueOf("popupReview")) {
    const data = await getMwApi().get(params);
    userState.canReview = data.query.users[0].rights.includes("review");
  }
};
let apiClient = null;
const getMwApi = () => {
  if (!apiClient) {
    const userAgent = `Navigation popups/1.0 (${mw.config.get("wgServerName")})`;
    setDownloaderUserAgent(userAgent);
    apiClient = new mw.Api({
      ajax: {
        headers: {
          "Api-User-Agent": userAgent
        }
      }
    });
  }
  return apiClient;
};

const log = (...args) => {
  if (window.popupDebug) {
    console.log(...args);
  }
};
const errlog = (...args) => {
  if (window.popupDebug) {
    console.error(...args);
  }
};

const getJsObj = (json) => {
  try {
    const json_ret = JSON.parse(json);
    if (json_ret.warnings) {
      for (const warning of Object.values(json_ret.warnings)) {
        if (warning["*"]) {
          log(warning["*"]);
        } else {
          log(warning.warnings);
        }
      }
    } else if (json_ret.error) {
      errlog(`${json_ret.error.code}: ${json_ret.error.info}`);
    }
    return json_ret;
  } catch {
    errlog(`Something went wrong with getJsObj, json=${json}`);
    return 1;
  }
};
const anyChild = (obj) => {
  for (const p in obj) {
    return obj[p];
  }
  return null;
};
const literalizeRegex = (str) => mw.util.escapeRegExp(str);
const entify = (str) => str.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
const removeNulls = (val) => val !== null;
const joinPath = (list) => list.filter(removeNulls).join("/");
const assume$2 = (value) => value;
const zeroFill = (n, l = 2) => `${n}`.padStart(l, "0");
const map = (f, o) => {
  if (Array.isArray(o)) {
    return map_array(f, o);
  }
  return map_object(f, o);
};
const map_array = (f, o) => {
  const ret = [];
  for (const item of o) {
    ret.push(f(item));
  }
  return ret;
};
const map_object = (f, o) => {
  const ret = {};
  for (const i in o) {
    ret[String(o)] = f(o[i]);
  }
  return ret;
};
const escapeQuotesHTML = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeQuotesHTML = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

let setupPopupsHook = null;
const registerSetupPopups = (fn) => {
  setupPopupsHook = fn;
};
let modifyWatchlistHook = null;
const registerModifyWatchlist = (fn) => {
  modifyWatchlistHook = fn;
};
const substitute = (data, cmdBody) => {
  const fromRe = RegExp(cmdBody.from, cmdBody.flags);
  return data.replace(fromRe, cmdBody.to);
};
const execCmds = (_data, cmdList) => {
  let data = _data;
  if (!cmdList) {
    return data;
  }
  for (const cmd of cmdList) {
    data = cmd.action(data, cmd);
  }
  return data;
};
const parseCmd = (str) => {
  if (!str.length) {
    return [];
  }
  let p;
  switch (str.charAt(0)) {
    case "s":
      p = parseSubstitute(str);
      break;
    default:
      return false;
  }
  if (p) {
    return [p].concat(parseCmd(p.remainder));
  }
  return false;
};
const unEscape = (str, sep) => str.split("\\\\").join("\\").split(`\\${sep}`).join(sep).split("\\n").join("\n");
const parseSubstitute = (_str) => {
  let str = _str;
  let from, to, flags, tmp;
  if (str.length < 4) {
    return false;
  }
  const sep = str.charAt(1);
  str = str.substring(2);
  tmp = skipOver(str, sep);
  if (tmp) {
    from = tmp.segment;
    str = tmp.remainder;
  } else {
    return false;
  }
  tmp = skipOver(str, sep);
  if (tmp) {
    to = tmp.segment;
    str = tmp.remainder;
  } else {
    return false;
  }
  flags = "";
  if (str.length) {
    tmp = skipOver(str, ";") || skipToEnd(str);
    flags = tmp.segment;
    str = tmp.remainder;
  }
  return {
    action: substitute,
    from,
    to,
    flags,
    remainder: str
  };
};
const skipOver = (str, sep) => {
  const endSegment = findNext(str, sep);
  if (endSegment < 0) {
    return false;
  }
  const segment = unEscape(str.substring(0, endSegment), sep);
  return {
    segment,
    remainder: str.substring(endSegment + 1)
  };
};
const skipToEnd = (str) => ({
  segment: str,
  remainder: ""
});
const findNext = (str, ch) => {
  for (let i = 0; i < str.length; ++i) {
    if (str.charAt(i) === "\\") {
      i += 2;
    }
    if (str.charAt(i) === ch) {
      return i;
    }
  }
  return -1;
};
const setCheckbox = (param, box) => {
  const val = mw.util.getParamValue(param);
  if (val && box) {
    switch (val) {
      case "1":
      case "yes":
      case "true":
        box.checked = true;
        break;
      case "0":
      case "no":
      case "false":
        box.checked = false;
    }
  }
};
const autoEdit = () => {
  if (!document.editform) {
    return false;
  }
  if ((mw.util.getParamValue("wpChangeTags") ?? "").includes("Popups")) {
    const wpChangeTags = document.createElement("input");
    wpChangeTags.type = "hidden";
    wpChangeTags.name = "wpChangeTags";
    wpChangeTags.value = "Popups";
    document.editform.append(wpChangeTags);
    document.editform.action += "&wpChangeTags=Popups";
    if (mw.util.getParamValue("autoclick") === "wpSave") {
      wpChangeTags.value += ",Automation tool";
      document.editform.action += "%2CAutomation%20tool";
    }
  }
  if (setupPopupsHook) {
    void setupPopupsHook(() => {
      if (mw.util.getParamValue("autoimpl") !== popupString("autoedit_version")) {
        return false;
      }
      if (mw.util.getParamValue("autowatchlist") && mw.util.getParamValue("actoken") === autoClickToken()) {
        void modifyWatchlistHook?.(mw.util.getParamValue("title"), mw.util.getParamValue("action"));
      }
      if (!document.editform) {
        return false;
      }
      if (autoEdit.alreadyRan) {
        return false;
      }
      autoEdit.alreadyRan = true;
      const cmdString = mw.util.getParamValue("autoedit");
      if (cmdString) {
        try {
          const editbox = document.editform.wpTextbox1;
          if (!editbox) {
            return;
          }
          const cmdList = parseCmd(cmdString);
          const input = editbox.value;
          const output = execCmds(input, cmdList);
          editbox.value = output;
        } catch {
          return;
        }
        if (typeof wikEdUseWikEd !== "undefined") {
          if (wikEdUseWikEd) {
            WikEdUpdateFrame();
          }
        }
      }
      setCheckbox("autominor", document.editform.wpMinoredit);
      setCheckbox("autowatch", document.editform.wpWatchthis);
      const rvid = mw.util.getParamValue("autorv");
      if (rvid) {
        const url = `${siteState.apiwikibase}?action=query&format=json&formatversion=2&prop=revisions&revids=${rvid}`;
        startDownload(url, null, autoEdit2);
      } else {
        autoEdit2();
      }
      return void 0;
    });
  }
  return void 0;
};
const autoEdit2 = (d) => {
  let summary = mw.util.getParamValue("autosummary");
  let summaryprompt = mw.util.getParamValue("autosummaryprompt");
  let summarynotice = "";
  if (d?.data && mw.util.getParamValue("autorv")) {
    const s = getRvSummary(summary, d.data);
    if (s === false) {
      summaryprompt = true;
      summarynotice = popupString("Failed to get revision information, please edit manually.\n\n");
      summary = simplePrintf(assume$2(summary), [mw.util.getParamValue("autorv"), "(unknown)", "(unknown)"]);
    } else {
      summary = s;
    }
  }
  if (summaryprompt) {
    const txt = summarynotice + popupString("Enter a non-empty edit summary or press cancel to abort");
    const response = prompt(txt, summary);
    if (response) {
      summary = response;
    } else {
      return;
    }
  }
  if (summary) {
    if (document.editform?.wpSummary) {
      document.editform.wpSummary.value = summary;
    }
  }
  setTimeout(autoEdit3, 100);
};
const autoClickToken = () => mw.user.sessionId();
const autoEdit3 = () => {
  if (mw.util.getParamValue("actoken") !== autoClickToken()) {
    return;
  }
  const btn = mw.util.getParamValue("autoclick");
  if (btn) {
    if (document.editform?.[btn]) {
      const button = document.editform[btn];
      const msg = tprintf("The %s button has been automatically clicked. Please wait for the next page to load.", [button.value]);
      bannerMessage(msg);
      document.title = `(${document.title})`;
      button.click();
    } else {
      alert(tprintf("Could not find button %s. Please check the settings in your javascript file.", [btn]));
    }
  }
};
const bannerMessage = (s) => {
  const headings = document.getElementsByTagName("h1");
  const div = document.createElement("div");
  div.innerHTML = `<font size=+1><b>${escapeQuotesHTML(s)}</b></font>`;
  headings[0].parentNode?.insertBefore(div, headings[0]);
};
const getRvSummary = (template, json) => {
  try {
    const o = getJsObj(json ?? "");
    const edit = anyChild(o.query?.pages ?? {});
    const revision = edit?.revisions?.[0];
    if (!revision) {
      return false;
    }
    const timestamp = revision.timestamp.split(/[A-Z]/g).join(" ").replace(/^ *| *$/g, "");
    return simplePrintf(assume$2(template), [revision.revid, timestamp, revision.userhidden ? "(hidden)" : revision.user]);
  } catch {
    return false;
  }
};

const structures = {};
const copyStructure = (oldStructure, newStructure) => {
  structures[newStructure] = {
    ...structures[oldStructure],
    slots: { ...structures[oldStructure].slots }
  };
};
structures.original = {
  popupLayout: () => [
    "popupError",
    "popupImage",
    "popupTopLinks",
    "popupTitle",
    "popupUserData",
    "popupData",
    "popupOtherLinks",
    "popupRedir",
    ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
    "popupMiscTools",
    ["popupRedlink"],
    "popupPrePreviewSep",
    "popupPreview",
    "popupSecondPreview",
    "popupPreviewMore",
    "popupPostPreview",
    "popupFixDab"
  ],
  popupRedirSpans: () => ["popupRedir", "popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
  slots: {
    popupTitle: "original.popupTitle",
    popupTopLinks: "original.popupTopLinks",
    popupImage: "original.popupImage",
    // legacy：popupRedirTitle/popupRedirTopLinks 与非 redir 版指向同一函数
    popupRedirTitle: "original.popupTitle",
    popupRedirTopLinks: "original.popupTopLinks"
  }
};
copyStructure("original", "nostalgia");
structures.nostalgia.slots.popupTopLinks = "nostalgia.popupTopLinks";
structures.nostalgia.slots.popupRedirTopLinks = "nostalgia.popupTopLinks";
copyStructure("original", "fancy");
structures.fancy.slots.popupTitle = "fancy.popupTitle";
structures.fancy.slots.popupTopLinks = "fancy.popupTopLinks";
structures.fancy.slots.popupOtherLinks = "fancy.popupOtherLinks";
structures.fancy.slots.popupRedirTitle = "fancy.popupTitle";
structures.fancy.slots.popupRedirTopLinks = "fancy.popupTopLinks";
structures.fancy.slots.popupRedirOtherLinks = "fancy.popupOtherLinks";
copyStructure("fancy", "fancy2");
structures.fancy2.popupLayout = () => [
  "popupError",
  "popupImage",
  "popupTitle",
  "popupUserData",
  "popupData",
  "popupTopLinks",
  "popupOtherLinks",
  "popupRedir",
  ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
  "popupMiscTools",
  ["popupRedlink"],
  "popupPrePreviewSep",
  "popupPreview",
  "popupSecondPreview",
  "popupPreviewMore",
  "popupPostPreview",
  "popupFixDab"
];
structures.fancy2.slots.popupTopLinks = "fancy2.popupTopLinks";
copyStructure("original", "menus");
structures.menus.popupLayout = () => [
  "popupError",
  "popupImage",
  "popupTopLinks",
  "popupTitle",
  "popupOtherLinks",
  "popupRedir",
  ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"],
  "popupUserData",
  "popupData",
  "popupMiscTools",
  ["popupRedlink"],
  "popupPrePreviewSep",
  "popupPreview",
  "popupSecondPreview",
  "popupPreviewMore",
  "popupPostPreview",
  "popupFixDab"
];
structures.menus.slots.popupTopLinks = "menus.popupTopLinks";
structures.menus.slots.popupRedirTopLinks = "menus.popupTopLinks";
copyStructure("menus", "shortmenus");
structures.shortmenus.slots.popupTopLinks = "shortmenus.popupTopLinks";
structures.shortmenus.slots.popupRedirTopLinks = "shortmenus.popupTopLinks";
structures.lite = {
  popupLayout: () => ["popupTitle", "popupPreview"],
  slots: {
    popupTitle: "lite.popupTitle"
  }
};
const slotFillers = /* @__PURE__ */ new Map();
const registerSlotFiller = (name, filler) => {
  slotFillers.set(name, filler);
};
const getSlotFiller = (name) => slotFillers.get(name);
const flattenLayout = (list) => {
  const ret = [];
  for (const item of list) {
    if (typeof item === "string") {
      ret.push(item);
    } else {
      ret.push(...flattenLayout(item));
    }
  }
  return ret;
};

let positionChecker = null;
const registerPositionChecker = (fn) => {
  positionChecker = fn;
};
let tooltipScanner = null;
const registerTooltipScanner = (fn) => {
  tooltipScanner = fn;
};
let currentIdNumber = 0;
const setPopupIdNumber = (n) => {
  currentIdNumber = n;
};
const setPopupHTML = (str, elementId, _popupId, onSuccess, append) => {
  let popupId = _popupId;
  if (typeof popupId === "undefined") {
    popupId = currentIdNumber;
  }
  const popupElement = document.getElementById(elementId + String(popupId));
  if (popupElement) {
    if (!append) {
      popupElement.innerHTML = "";
    }
    if (typeof str === "string") {
      popupElement.innerHTML += str;
    } else if (str) {
      popupElement.appendChild(str);
    }
    if (onSuccess) {
      onSuccess();
    }
    if (positionChecker) {
      setTimeout(positionChecker, 100);
    }
    return true;
  }
  setTimeout(() => {
    setPopupHTML(str, elementId, popupId, onSuccess);
  }, 600);
  return null;
};
const setPopupTrailer = (str, id) => setPopupHTML(str, "popupData", id);
const assume$1 = (value) => value;
const fillEmptySpans = (args) => {
  const redir = !!args.redir;
  const a = assume$1(args.navpopup.parentAnchor);
  let article;
  let hint = null;
  let oldid = null;
  let rcid;
  let params = {};
  if (redir && typeof args.redirTarget === "object") {
    article = args.redirTarget;
  } else {
    article = new Title().fromAnchor(a);
    hint = a.originalTitle || article.hintValue();
    params = parseParams(a.href);
    oldid = getValueOf("popupHistoricalLinks") ? params.oldid : null;
    rcid = params.rcid;
  }
  const x = {
    article,
    hint,
    oldid,
    rcid,
    navpop: args.navpopup,
    params
  };
  const structure = structures[getValueOf("popupStructure")];
  const spans = flattenLayout(structure.popupLayout());
  const redirs = structure.popupRedirSpans ? structure.popupRedirSpans() : [];
  for (const span of spans) {
    const found = redirs.includes(span);
    if (found !== redir) {
      continue;
    }
    const fillerKey = structure.slots[span];
    const filler = fillerKey === void 0 ? void 0 : getSlotFiller(fillerKey);
    if (!filler) {
      continue;
    }
    const setfn = getValueOf("popupActiveNavlinks") && (span.startsWith("popupTopLinks") || span.startsWith("popupRedirTopLinks")) ? setPopupTipsAndHTML : setPopupHTML;
    log(`running ${span}({article:${String(x.article)}, hint:${String(x.hint)}, oldid: ${String(x.oldid)}})`);
    setfn(filler(x), span, args.navpopup.idNumber);
  }
};
const popupHTML = (a) => {
  getValueOf("popupStructure");
  const structure = structures[optionStore.popupStructure];
  if (!structure) {
    optionStore.popupStructure = optionDefault.popupStructure;
    return popupHTML(a);
  }
  const navpop = a.navpopup;
  if (!navpop) {
    return "";
  }
  return makeEmptySpans(structure.popupLayout(), navpop);
};
const makeEmptySpans = (list, navpop) => {
  let ret = "";
  for (const item of list) {
    if (typeof item === "string") {
      ret += emptySpanHTML(item, navpop.idNumber);
    } else {
      ret = parenSplit(ret, RegExp("(</[^>]*?>$)")).join(makeEmptySpans(item, navpop));
    }
  }
  return ret;
};
const emptySpanHTMLClassAliases = {
  popupSecondPreview: "popupPreview"
};
const emptySpanHTML = (name, id) => {
  let classname = emptySpanHTMLClassAliases[name] || name;
  if (name === getValueOf("popupDragHandle")) {
    classname += " popupDragHandle";
  }
  return simplePrintf('<%s id="%s" class="%s"></%s>', ["div", name + String(id), classname, "div"]);
};
const imageHTML = (idNumber) => simplePrintf('<a id="popupImageLink$1"><img align="right" valign="top" id="popupImg$1" style="display: none;"></img></a>', [String(idNumber)]);
const popTipsSoonFn = (id, _when, popData) => {
  let when = _when;
  if (!when) {
    when = 250;
  }
  const popTips = () => {
    if (tooltipScanner) {
      tooltipScanner(document.getElementById(id), popData);
    }
  };
  return () => {
    setTimeout(popTips, when);
  };
};
const setPopupTipsAndHTML = (html, divname, idnumber, popData) => {
  setPopupHTML(html, divname, idnumber, getValueOf("popupSubpopups") ? popTipsSoonFn(divname + String(idnumber), null, popData) : null);
};

class Drag {
  constructor() {
    this.startCondition = null;
    this.endHook = null;
    this.fixE = (_e) => {
      let e = _e;
      if (typeof e === "undefined") {
        e = window.event;
      }
      if (!e) {
        return e;
      }
      const legacy = e;
      if (typeof legacy.layerX === "undefined") {
        legacy.layerX = legacy.offsetX;
      }
      if (typeof legacy.layerY === "undefined") {
        legacy.layerY = legacy.offsetY;
      }
      return e;
    };
  }
  init(o, oRoot) {
    const obj = o;
    this.obj = obj;
    obj.onmousedown = (e) => {
      this.start(e);
    };
    obj.dragging = false;
    obj.popups_draggable = true;
    obj.hmode = true;
    obj.vmode = true;
    obj.root = oRoot;
    if (isNaN(parseInt(obj.root.style.left, 10))) {
      obj.root.style.left = "0px";
    }
    if (isNaN(parseInt(obj.root.style.top, 10))) {
      obj.root.style.top = "0px";
    }
    obj.root.onthisStart = () => {
    };
    obj.root.onthisEnd = () => {
    };
    obj.root.onthis = () => {
    };
  }
  start(_e) {
    let e = _e;
    const o = this.obj;
    e = this.fixE(e);
    if (!e) {
      return;
    }
    if (this.startCondition && !this.startCondition(e)) {
      return;
    }
    const y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
    const x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
    o.root.onthisStart(x, y);
    o.lastMouseX = e.clientX;
    o.lastMouseY = e.clientY;
    o.onmousemoveDefault = document.onmousemove;
    o.dragging = true;
    document.onmousemove = (e2) => {
      this.drag(e2);
    };
    document.onmouseup = () => {
      this.end();
    };
    return false;
  }
  drag(_e) {
    let e = _e;
    e = this.fixE(e);
    if (!e) {
      return;
    }
    const o = this.obj;
    const ey = e.clientY;
    const ex = e.clientX;
    const y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
    const x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
    const nx = x + (ex - o.lastMouseX) * (o.hmode ? 1 : -1);
    const ny = y + (ey - o.lastMouseY) * (o.vmode ? 1 : -1);
    this.obj.root.style[o.hmode ? "left" : "right"] = `${nx}px`;
    this.obj.root.style[o.vmode ? "top" : "bottom"] = `${ny}px`;
    this.obj.lastMouseX = ex;
    this.obj.lastMouseY = ey;
    this.obj.root.onthis(nx, ny);
    return false;
  }
  end() {
    document.onmousemove = this.obj.onmousemoveDefault;
    document.onmouseup = null;
    this.obj.dragging = false;
    if (this.endHook) {
      this.endHook(parseInt(this.obj.root.style[this.obj.hmode ? "left" : "right"], 10), parseInt(this.obj.root.style[this.obj.vmode ? "top" : "bottom"], 10));
    }
  }
}
const setupDraggable = (navpop) => {
  if (!getValueOf("popupDraggable")) {
    return;
  }
  let dragHandle = getValueOf("popupDragHandle") ?? null;
  if (dragHandle && dragHandle !== "all") {
    dragHandle += String(navpop.idNumber);
  }
  setTimeout(() => {
    navpop.makeDraggable(dragHandle);
  }, 150);
};

class Mousetracker {
  constructor() {
    // 400ms：上游定值——鼠标静止（无 mousemove 事件）时也要周期性跑 hooks，
    // 否则 posCheckerHook 的隐藏倒计时在鼠标停下后就再无机会推进
    this.loopDelay = 400;
    // ReturnType 形式兼容 DOM（number）与 Node（Timeout）两套定时器类型环境
    this.timer = null;
    this.active = false;
    // 拖拽等绕过 mousemove 的操作结束后置脏：下一次坐标上报先清脏、
    // 不跑 hooks（拖完瞬间不该触发“鼠标移到弹窗外就藏”之类判定）
    this.dirty = true;
    this.hooks = [];
  }
  addHook(f) {
    this.hooks.push(f);
  }
  runHooks() {
    if (!this.hooks.length) {
      return;
    }
    let remove = false;
    const removeObj = {};
    const x = this.x, y = this.y, len = this.hooks.length;
    for (let i = 0; i < len; ++i) {
      if (this.hooks[i](x, y) === true) {
        remove = true;
        removeObj[i] = true;
      }
    }
    if (remove) {
      this.removeHooks(removeObj);
    }
  }
  removeHooks(removeObj) {
    const newHooks = [];
    const len = this.hooks.length;
    for (let i = 0; i < len; ++i) {
      if (!removeObj[i]) {
        newHooks.push(this.hooks[i]);
      }
    }
    this.hooks = newHooks;
  }
  track(_e) {
    const e = _e ?? window.event;
    let x, y;
    if (e) {
      if (e.pageX) {
        x = e.pageX;
        y = e.pageY;
      } else if (typeof e.clientX !== "undefined") {
        const docElt = document.documentElement;
        const left = docElt.scrollLeft || document.body.scrollLeft || document.scrollLeft || 0;
        const top = docElt.scrollTop || document.body.scrollTop || document.scrollTop || 0;
        x = e.clientX + left;
        y = e.clientY + top;
      } else {
        return;
      }
      this.setPosition(x, y);
    }
  }
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    if (this.dirty || this.hooks.length === 0) {
      this.dirty = false;
      return;
    }
    if (typeof this.lastHook_x !== "number" || typeof this.lastHook_y !== "number") {
      this.lastHook_x = -100;
      this.lastHook_y = -100;
    }
    let diff = (this.lastHook_x - x) * (this.lastHook_y - y);
    diff = diff >= 0 ? diff : -diff;
    if (diff > 1) {
      this.lastHook_x = x;
      this.lastHook_y = y;
      this.runHooks();
    }
  }
  enable() {
    if (this.active) {
      return;
    }
    this.active = true;
    this.savedHandler = document.onmousemove;
    document.onmousemove = (e) => {
      this.track(e);
    };
    if (this.loopDelay) {
      this.timer = setInterval(() => {
        this.runHooks();
      }, this.loopDelay);
    }
  }
  disable() {
    if (!this.active) {
      return;
    }
    if (typeof this.savedHandler === "function") {
      document.onmousemove = this.savedHandler;
    } else {
      Reflect.deleteProperty(document, "onmousemove");
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.active = false;
  }
}

const _Navpopup = class _Navpopup {
  constructor() {
    this.uid = _Navpopup.uid++;
    this.visible = false;
    this.noshow = false;
    this.hooks = {
      create: [],
      unhide: [],
      hide: []
    };
    this.hookIds = {};
    this.downloads = /* @__PURE__ */ new Set();
    // 静止检测的上一稳定点；引导值 -1e4 保证首轮必判为“未静止”
    this.stable_x = 0;
    this.stable_y = 0;
    // 以下字段由 events/actions 等外域装配（legacy 同款分工）：
    // pending=下载记账、idNumber=跨弹窗编号（把手 id/预览槽位用）、
    // parentAnchor/mouseLeavingTime/stopPopupTimer=mouseout 域隐藏流
    this.pending = null;
    this.fuzz = 5;
    this.constrained = true;
    this.width = 0;
    this.height = 0;
    // redirect-following state driven by preview pipeline（legacy 注释同义）：
    // redir=已跟随重定向次数、redirTarget=跟随后的目标——由 pipeline 域的
    // loadPreviewFromRedir 驱动
    this.redir = 0;
    this.createMainDiv();
  }
  isVisible() {
    return this.visible;
  }
  reposition(x, y, noLimitHor) {
    log(`reposition(${String(x)},${String(y)},${String(noLimitHor)})`);
    if (typeof x !== "undefined" && x !== null) {
      this.left = x;
    }
    if (typeof y !== "undefined" && y !== null) {
      this.top = y;
    }
    if (typeof this.left !== "undefined" && typeof this.top !== "undefined") {
      this.mainDiv.style.left = `${this.left}px`;
      this.mainDiv.style.top = `${this.top}px`;
    }
    if (!noLimitHor) {
      this.limitHorizontalPosition();
    }
  }
  limitHorizontalPosition() {
    if (!this.constrained || this.tooWide) {
      return;
    }
    this.updateDimensions();
    const x = this.left ?? Number.NaN;
    const w = this.width;
    const cWidth = document.body.clientWidth;
    if (x + w >= cWidth || x > 0 && this.maxWidth && this.width < this.maxWidth && this.height > this.width && x > cWidth - this.maxWidth) {
      this.mainDiv.style.left = "-10000px";
      this.mainDiv.style.width = `${String(this.maxWidth)}px`;
      const naturalWidth = parseInt(String(this.mainDiv.offsetWidth), 10);
      let newLeft = cWidth - naturalWidth - 1;
      if (newLeft < 0) {
        newLeft = 0;
        this.tooWide = true;
      }
      log(`limitHorizontalPosition: moving to (${newLeft},${String(this.top)}); naturalWidth=${naturalWidth}, clientWidth=${cWidth}`);
      this.reposition(newLeft, null, true);
    }
  }
  raise() {
    this.mainDiv.style.zIndex = String(_Navpopup.highest + 1);
    ++_Navpopup.highest;
  }
  show() {
    if (this.noshow) {
      return;
    }
    this.reposition();
    this.raise();
    this.unhide();
  }
  showSoonIfStable(time) {
    log(`showSoonIfStable, time=${time}`);
    if (this.visible) {
      return;
    }
    this.noshow = false;
    this.stable_x = -1e4;
    this.stable_y = -1e4;
    this.showSoonStableTimer = setInterval(() => {
      log("stableShow called");
      const new_x = _Navpopup.tracker.x ?? Number.NaN;
      const new_y = _Navpopup.tracker.y ?? Number.NaN;
      const dx = this.stable_x - new_x;
      const dy = this.stable_y - new_y;
      if (dx * dx <= 0 && dy * dy <= 0) {
        log("mouse is stable");
        clearInterval(this.showSoonStableTimer);
        this.reposition(new_x + 2, new_y + 2);
        this.show();
        this.limitHorizontalPosition();
        return;
      }
      this.stable_x = new_x;
      this.stable_y = new_y;
    }, time / 2);
  }
  banish() {
    log("banish called");
    this.noshow = true;
    if (this.showSoonStableTimer) {
      log("clearing showSoonStableTimer");
      clearInterval(this.showSoonStableTimer);
    }
    this.hide();
  }
  runHooks(key, when) {
    if (!this.hooks[key]) {
      return;
    }
    const keyHooks = this.hooks[key];
    const len = keyHooks.length;
    for (let i = 0; i < len; ++i) {
      const entry = keyHooks[i];
      if (entry && entry.when === when) {
        if (Reflect.apply(entry.hook, this, [])) {
          if (entry.hookId) {
            Reflect.deleteProperty(this.hookIds, entry.hookId);
          }
          keyHooks[i] = null;
        }
      }
    }
  }
  addHook(hook, key, _when, uid) {
    const when = _when ?? "after";
    if (!this.hooks[key]) {
      return;
    }
    let hookId = null;
    if (uid) {
      hookId = [key, when, uid].join("|");
      if (this.hookIds[hookId]) {
        return;
      }
      this.hookIds[hookId] = true;
    }
    this.hooks[key].push({
      hook,
      when,
      hookId
    });
  }
  createMainDiv() {
    this.runHooks("create", "before");
    const mainDiv = document.createElement("div");
    mainDiv.onclick = () => {
      this.onclickHandler();
    };
    mainDiv.className = this.className ? this.className : "navpopup_maindiv";
    mainDiv.id = `${mainDiv.className}${this.uid}`;
    mainDiv.style.position = "absolute";
    mainDiv.style.minWidth = "350px";
    mainDiv.style.display = "none";
    mainDiv.className = "navpopup";
    mainDiv.navpopup = this;
    this.mainDiv = mainDiv;
    document.body.appendChild(mainDiv);
    this.runHooks("create", "after");
  }
  onclickHandler() {
    this.raise();
  }
  makeDraggable(handleName) {
    const drag = new Drag();
    if (!handleName) {
      drag.startCondition = (e) => {
        try {
          if (!e.shiftKey) {
            return false;
          }
        } catch {
          return false;
        }
        return true;
      };
    }
    let dragHandle = null;
    if (handleName) {
      dragHandle = document.getElementById(handleName);
    }
    if (!dragHandle) {
      dragHandle = this.mainDiv;
    }
    drag.endHook = (x, y) => {
      _Navpopup.tracker.dirty = true;
      this.reposition(x, y);
    };
    drag.init(dragHandle, this.mainDiv);
  }
  hide() {
    this.runHooks("hide", "before");
    this.abortDownloads();
    if (this.visible) {
      this.mainDiv.style.display = "none";
      this.visible = false;
    }
    this.runHooks("hide", "after");
  }
  unhide() {
    this.runHooks("unhide", "before");
    if (!this.visible) {
      this.mainDiv.style.display = "inline";
      this.visible = true;
    }
    this.runHooks("unhide", "after");
  }
  setInnerHTML(html) {
    this.mainDiv.innerHTML = html;
  }
  updateDimensions() {
    this.width = parseInt(String(this.mainDiv.offsetWidth), 10);
    this.height = parseInt(String(this.mainDiv.offsetHeight), 10);
  }
  isWithin(x, y) {
    if (!this.visible) {
      return false;
    }
    this.updateDimensions();
    const fuzz = this.fuzz || 0;
    const left = this.left ?? Number.NaN;
    const top = this.top ?? Number.NaN;
    const xx = x ?? Number.NaN;
    const yy = y ?? Number.NaN;
    return xx + fuzz >= left && xx - fuzz <= left + this.width && yy + fuzz >= top && yy - fuzz <= top + this.height;
  }
  abortDownloads() {
    for (const d of this.downloads) {
      d.abort();
    }
    this.downloads.clear();
  }
};
_Navpopup.uid = 0;
// 1000：起始 z-index，高于普通页面内容；每次置顶自增
_Navpopup.highest = 1e3;
// 纯状态构造（Mousetracker 构造不碰 DOM），符合「模块顶层零副作用」
// 对静态初始化的豁免；对 document.onmousemove 的接管只在 enable() 后
_Navpopup.tracker = new Mousetracker();
let Navpopup = _Navpopup;

const instaConf = {
  baseUrl: "",
  paths: { articles: "" },
  wiki: { interwiki: void 0 },
  locale: {
    image: "",
    category: "",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  },
  user: { name: "" }
};
let BLOCK_IMAGE;
const setupLivePreview = (site) => {
  instaConf.baseUrl = "";
  instaConf.paths.articles = `${site.articlePath}/`;
  instaConf.wiki.interwiki = site.interwiki;
  instaConf.locale.image = site.imageNamespace;
  instaConf.locale.category = site.categoryNamespace;
  instaConf.user.name = "Wikipedian";
  BLOCK_IMAGE = new RegExp(`^\\[\\[(?:File|Image|${site.imageNamespace}):.*?\\|.*?(?:frame|thumbnail|thumb|none|right|left|center)`, "i");
};
const wiki2html = (txt, baseurl) => {
  instaConf.baseUrl = baseurl;
  return convert(txt);
};
const assume = (value) => value;
const convert = (wiki) => {
  const ll = typeof wiki === "string" ? wiki.replace(/\r/g, "").split(/\n/) : wiki;
  let o = "";
  let p = 0;
  const ps = (s) => {
    o += s;
  };
  const sh = () => assume(ll.shift());
  const f = (template, ...args) => {
    let rest = template;
    let out = "";
    for (const arg of args) {
      const pos = rest.indexOf("?");
      if (pos === -1) {
        break;
      }
      out += rest.substring(0, pos) + String(arg);
      rest = rest.slice(pos + 1);
    }
    return out + rest;
  };
  const html_entities = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const htmlescape_text = (s) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/:/g, "&#58;").replace(/\[/g, "&#91;").replace(/]/g, "&#93;");
  const htmlescape_attr = (s) => htmlescape_text(s).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
  const str_imatch = (a, b) => {
    const l = Math.min(a.length, b.length);
    let i;
    for (i = 0; i < l; i++) {
      if (a.charAt(i) !== b.charAt(i)) {
        break;
      }
    }
    return i;
  };
  const charAtPoint = (pos) => ll[0].charAt(pos);
  const endl = (s) => {
    ps(s);
    sh();
  };
  const parse_list = () => {
    let prev = "";
    while (ll.length) {
      const m = /^([*#:;]+)(.*)$/.exec(ll[0]);
      if (!m) {
        break;
      }
      sh();
      const ipos = str_imatch(prev, m[1]);
      for (let prevPos = prev.length - 1; prevPos >= ipos; prevPos--) {
        const pi = prev.charAt(prevPos);
        if (pi === "*") {
          ps("</ul>");
        } else if (pi === "#") {
          ps("</ol>");
        } else if (m[1].charAt(prevPos) !== "") {
          ps("</dl>");
        }
      }
      for (let matchPos = ipos; matchPos < m[1].length; matchPos++) {
        const li = m[1].charAt(matchPos);
        if (li === "*") {
          ps("<ul>");
        } else if (li === "#") {
          ps("<ol>");
        } else if (prev.charAt(matchPos) !== "") {
          ps("<dl>");
        }
      }
      switch (m[1].charAt(m[1].length - 1)) {
        case "*":
        case "#":
          ps(`<li>${parse_inline_nowiki(m[2])}`);
          break;
        case ";": {
          ps("<dt>");
          const dtMatch = /(.*?)(:.*?)$/.exec(m[2]);
          if (dtMatch) {
            ps(parse_inline_nowiki(dtMatch[1]));
            ll.unshift(dtMatch[2]);
          } else {
            ps(parse_inline_nowiki(m[2]));
          }
          break;
        }
        case ":":
          ps(`<dd>${parse_inline_nowiki(m[2])}`);
      }
      prev = m[1];
    }
    for (let i = prev.length - 1; i >= 0; i--) {
      ps(f("</?>", prev.charAt(i) === "*" ? "ul" : prev.charAt(i) === "#" ? "ol" : "dl"));
    }
  };
  const parse_table = () => {
    const attrMatch = /^\{\|( .*)$/.exec(ll[0]);
    endl(f("<table>", attrMatch ? attrMatch[1] : ""));
    while (ll.length) {
      if (ll[0].startsWith("|")) {
        switch (charAtPoint(1)) {
          case "}":
            endl("</table>");
            return;
          case "-":
            endl(f("<tr>", assume(/\|-*(.*)/.exec(ll[0]))[1]));
            break;
          default:
            parse_table_data();
        }
      } else if (ll[0].startsWith("!")) {
        parse_table_data();
      } else {
        sh();
      }
    }
  };
  const parse_table_data = () => {
    const tdMatch = assume(/^(\|\+|\||!)((?:([^[|]*?)\|(?!\|))?(.*))$/.exec(sh()));
    if (tdMatch[1] === "|+") {
      ps("<caption");
    } else {
      ps(`<t${tdMatch[1] === "|" ? "d" : "h"}`);
    }
    const matchI = typeof tdMatch[3] !== "undefined" ? 4 : 2;
    ps(">");
    if (tdMatch[1] !== "|+") {
      const tdLine = tdMatch[matchI].split(tdMatch[1] === "|" ? "||" : /(?:\|\||!!)/);
      ps(parse_inline_nowiki(assume(tdLine.shift())));
      while (tdLine.length) {
        ll.unshift(tdMatch[1] + assume(tdLine.pop()));
      }
    } else {
      ps(parse_inline_nowiki(tdMatch[matchI]));
    }
    let tc = 0;
    const td = [];
    while (ll.length) {
      td.push(sh());
      if (ll.length && ll[0].startsWith("|")) {
        if (!tc) {
          break;
        } else if (charAtPoint(1) === "}") {
          tc--;
        }
      } else if (!tc && ll.length && ll[0].startsWith("!")) {
        break;
      } else if (ll.length && ll[0].startsWith("{|")) {
        tc++;
      }
    }
    if (td.length) {
      ps(convert(td));
    }
  };
  const parse_pre = () => {
    ps("<pre>");
    do {
      endl(`${parse_inline_nowiki(ll[0].substring(1))}
`);
    } while (ll.length && ll[0].startsWith(" "));
    ps("</pre>");
  };
  const parse_block_image = () => {
    sh();
  };
  const parse_inline_nowiki = (str) => {
    let lastend = 0;
    let substart = 0;
    let nestlev = 0;
    let html = "";
    let start = str.indexOf("<nowiki>", substart);
    while (start !== -1) {
      html += parse_inline_wiki(str.substring(lastend, start));
      start += 8;
      substart = start;
      let subloop = true;
      do {
        const open = str.indexOf("<nowiki>", substart);
        const close = str.indexOf("</nowiki>", substart);
        if (close <= open || open === -1) {
          if (close === -1) {
            return html + html_entities(str.slice(start));
          }
          substart = close + 9;
          if (nestlev) {
            nestlev--;
          } else {
            lastend = substart;
            html += html_entities(str.substring(start, lastend - 9));
            subloop = false;
          }
        } else {
          substart = open + 8;
          nestlev++;
        }
      } while (subloop);
      start = str.indexOf("<nowiki>", substart);
    }
    return html + parse_inline_wiki(str.slice(lastend));
  };
  const parse_inline_images = (_str) => {
    let str = _str;
    let substart = 0;
    let nestlev = 0;
    let start = str.indexOf("[[", substart);
    while (start !== -1) {
      if (RegExp(`^(Image|File|${instaConf.locale.image}):`, "i").test(str.slice(start + 2))) {
        let loop = true;
        substart = start;
        do {
          substart += 2;
          const close = str.indexOf("]]", substart);
          const open = str.indexOf("[[", substart);
          if (close <= open || open === -1) {
            if (close === -1) {
              return str;
            }
            substart = close;
            if (nestlev) {
              nestlev--;
            } else {
              const wiki2 = str.substring(start, close + 2);
              str = str.replace(wiki2, "");
              substart = start;
              loop = false;
            }
          } else {
            substart = open;
            nestlev++;
          }
        } while (loop);
      } else {
        break;
      }
      start = str.indexOf("[[", substart);
    }
    return str;
  };
  const parse_inline_formatting = (str) => {
    let italic = false;
    let bold = false;
    let li = 0;
    let o2 = "";
    let i = str.indexOf("''", li);
    while (i !== -1) {
      o2 += str.substring(li, i);
      li = i + 2;
      if (str.charAt(i + 2) === "'") {
        li++;
        bold = !bold;
        o2 += bold ? "<b>" : "</b>";
      } else {
        italic = !italic;
        o2 += italic ? "<i>" : "</i>";
      }
      i = str.indexOf("''", li);
    }
    return o2 + str.slice(li);
  };
  const parse_inline_wiki = (_str) => {
    let str = parse_inline_images(_str);
    str = str.replace(/<math>(.*?)<\/math>/gi, "");
    const date = /* @__PURE__ */ new Date();
    let minutes = date.getUTCMinutes();
    if (minutes < 10) {
      minutes = `0${minutes}`;
    }
    const dateStr = f("?:?, ? ? ? (UTC)", date.getUTCHours(), minutes, date.getUTCDate(), instaConf.locale.months[date.getUTCMonth()], date.getUTCFullYear());
    str = str.replace(/~{5}(?!~)/g, dateStr).replace(/~{4}(?!~)/g, `${instaConf.user.name} ${dateStr}`).replace(/~{3}(?!~)/g, instaConf.user.name).replace(RegExp(`\\[\\[:((?:${instaConf.locale.category}|Image|File|${instaConf.locale.image}|${String(instaConf.wiki.interwiki)}):[^|]*?)\\]\\](\\w*)`, "gi"), (_$0, $1, $2) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($1) + htmlescape_text($2))).replace(RegExp(`\\[\\[(?:${instaConf.locale.category}|${String(instaConf.wiki.interwiki)}):.*?\\]\\]`, "gi"), "").replace(RegExp(`\\[\\[:((?:${instaConf.locale.category}|Image|File|${instaConf.locale.image}|${String(instaConf.wiki.interwiki)}):.*?)\\|([^\\]]+?)\\]\\](\\w*)`, "gi"), (_$0, $1, $2, $3) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($2) + htmlescape_text($3))).replace(/\[\[(\/[^|]*?)\]\]/g, (_$0, $1) => f("<a href='?'>?</a>", String(instaConf.baseUrl) + htmlescape_attr($1), htmlescape_text($1))).replace(/\[\[(\/.*?)\|(.+?)\]\]/g, (_$0, $1, $2) => f("<a href='?'>?</a>", String(instaConf.baseUrl) + htmlescape_attr($1), htmlescape_text($2))).replace(/\[\[([^[|]*?)\]\](\w*)/g, (_$0, $1, $2) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($1) + htmlescape_text($2))).replace(/\[\[([^[]*?)\|([^\]]+?)\]\](\w*)/g, (_$0, $1, $2, $3) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1), htmlescape_text($2) + htmlescape_text($3))).replace(/\[\[([^\]]*?:)?(.*?)( *\(.*?\))?\|\]\]/g, (_$0, $1, $2, $3) => f("<a href='?'>?</a>", instaConf.paths.articles + htmlescape_attr($1 ?? "") + htmlescape_attr($2) + htmlescape_attr($3 ?? ""), htmlescape_text($2))).replace(/\[(https?|news|ftp|mailto|gopher|irc):(\/*)([^\]]*?) (.*?)\]/g, (_$0, $1, $2, $3, $4) => f("<a class='external' href='?:?'>?</a>", htmlescape_attr($1), htmlescape_attr($2) + htmlescape_attr($3), htmlescape_text($4))).replace(/\[http:\/\/(.*?)\]/g, (_$0, $1) => f("<a class='external' href='http://?'>[#]</a>", htmlescape_attr($1))).replace(/\[(news|ftp|mailto|gopher|irc):(\/*)(.*?)\]/g, (_$0, $1, $2, $3) => f("<a class='external' href='?:?'>?:?</a>", htmlescape_attr($1), htmlescape_attr($2) + htmlescape_attr($3), htmlescape_text($1), htmlescape_text($2) + htmlescape_text($3))).replace(/(^| )(https?|news|ftp|mailto|gopher|irc):(\/*)([^ $]*[^.,!?;: $])/g, (_$0, $1, $2, $3, $4) => f("?<a class='external' href='?:?'>?:?</a>", htmlescape_text($1), htmlescape_attr($2), htmlescape_attr($3) + htmlescape_attr($4), htmlescape_text($2), htmlescape_text($3) + htmlescape_text($4))).replace("__NOTOC__", "").replace("__NOINDEX__", "").replace("__INDEX__", "").replace("__NOEDITSECTION__", "");
    return parse_inline_formatting(str);
  };
  while (ll.length) {
    const line = ll[0];
    const heading = /^(={1,6})(.*)\1(.*)$/.exec(line);
    if (heading) {
      p = 0;
      endl(f("<h?>?</h?>?", heading[1].length, parse_inline_nowiki(heading[2]), heading[1].length, heading[3]));
    } else if (/^[*#:;]/.test(line)) {
      p = 0;
      parse_list();
    } else if (line.startsWith(" ")) {
      p = 0;
      parse_pre();
    } else if (line.startsWith("{|")) {
      p = 0;
      parse_table();
    } else if (/^----+$/.test(line)) {
      p = 0;
      endl("<hr />");
    } else if (BLOCK_IMAGE.test(line)) {
      p = 0;
      parse_block_image();
    } else {
      if (line === "") {
        p = ll.length > 1 && ll[1] === "";
        if (p) {
          endl("<p><br>");
        }
      } else {
        if (!p) {
          ps("<p>");
          p = 1;
        }
        ps(`${parse_inline_nowiki(line)} `);
      }
      sh();
    }
  }
  return o;
};

const getEditboxSelection = () => {
  const editbox = document.editform?.wpTextbox1;
  if (document.selection) {
    return document.selection.createRange().text;
  }
  if (!editbox) {
    return "";
  }
  const selStart = editbox.selectionStart;
  const selEnd = editbox.selectionEnd;
  return editbox.value.substring(selStart, selEnd);
};
const doSelectionPopup = () => {
  const sel = getEditboxSelection();
  const open = sel.indexOf("[[");
  const pipe = sel.indexOf("|");
  const close = sel.indexOf("]]");
  if (open === -1 || pipe === -1 && close === -1) {
    return;
  }
  if (pipe !== -1 && open > pipe || close !== -1 && open > close) {
    return;
  }
  const article = new Title(sel.substring(open + 2, pipe < 0 ? close : pipe));
  if (getValueOf("popupOnEditSelection") === "boxpreview") {
    doSeparateSelectionPopup(sel);
    return;
  }
  if (close > 0 && sel.substring(close + 2).includes("[[")) {
    return;
  }
  const a = document.createElement("a");
  a.href = wiki.titlebase + article.urlString();
  mouseOverWikiLink2(a);
  const navpop = a.navpopup;
  if (navpop) {
    navpop.addHook(() => {
      runStopPopupTimer(navpop);
    }, "unhide", "after");
  }
};
const doSeparateSelectionPopup = (str) => {
  let div = document.getElementById("selectionPreview");
  if (!div) {
    div = document.createElement("div");
    div.id = "selectionPreview";
    const box = document.editform?.wpTextbox1;
    if (!box?.parentNode) {
      return;
    }
    box.parentNode.insertBefore(div, box);
  }
  div.innerHTML = wiki2html(str);
  div.ranSetupTooltipsAlready = false;
  popTipsSoonFn("selectionPreview")();
};

const popupHandleKeypress = (evt) => {
  const keyCode = window.event ? window.event.keyCode : evt.keyCode ? evt.keyCode : evt.which;
  const link = eventsState.current.link;
  if (!keyCode || !link?.navpopup) {
    return;
  }
  if (keyCode === 27) {
    Reflect.apply(killPopup, link, []);
    return false;
  }
  const letter = String.fromCharCode(keyCode);
  const links = link.navpopup.mainDiv.getElementsByTagName("A");
  let startLink = 0;
  let i, j;
  if (popupHandleKeypress.lastPopupLinkSelected) {
    for (i = 0; i < links.length; ++i) {
      if (links[i] === popupHandleKeypress.lastPopupLinkSelected) {
        startLink = i;
      }
    }
  }
  for (j = 0; j < links.length; ++j) {
    i = (startLink + j + 1) % links.length;
    if (links[i].getAttribute("popupkey") === letter) {
      evt.preventDefault();
      $(links[i]).trigger("focus");
      popupHandleKeypress.lastPopupLinkSelected = links[i];
      return false;
    }
  }
  if (document.oldPopupOnkeypress) {
    return document.oldPopupOnkeypress(evt);
  }
  return true;
};
const addPopupShortcuts = () => {
  if (document.onkeypress !== popupHandleKeypress) {
    document.oldPopupOnkeypress = document.onkeypress;
  }
  document.onkeypress = popupHandleKeypress;
};
const rmPopupShortcuts = () => {
  popupHandleKeypress.lastPopupLinkSelected = null;
  try {
    if (document.oldPopupOnkeypress && document.oldPopupOnkeypress === popupHandleKeypress) {
      document.onkeypress = null;
      return;
    }
    document.onkeypress = document.oldPopupOnkeypress ?? null;
  } catch {
  }
};
const addLinkProperty = (html, property) => {
  const i = html.indexOf(">");
  if (i < 0) {
    return html;
  }
  return `${html.substring(0, i)} ${property}${html.substring(i)}`;
};
const addPopupShortcut = (html, _key) => {
  let key = _key;
  if (!html || !getValueOf("popupShortcutKeys")) {
    return html;
  }
  const ret = addLinkProperty(html, `popupkey="${String(key)}"`);
  if (key === " ") {
    key = popupString("spacebar");
  }
  return ret.replace(/^(.*?)(title=")(.*?)(".*)$/i, `$1$2$3 [${String(key)}]$4`);
};

const pages = [];
const clearPages = () => {
  pages.length = 0;
};
const findInPageCache = (url) => {
  for (let i = 0; i < pages.length; ++i) {
    if (url === pages[i].url) {
      return i;
    }
  }
  return -1;
};
const addPageToCache = (download) => {
  log(`addPageToCache ${download.url}`);
  pages.push({
    url: download.url,
    data: download.data,
    lastModified: download.lastModified
  });
};
const getPage = (url, onComplete, owner) => {
  log("getPage");
  const callback = (d) => {
    if (!d.aborted) {
      addPageToCache(d);
      void onComplete(d);
    }
  };
  return startDownload(url, owner.idNumber, callback);
};
const getPageWithCaching = (url, onComplete, owner) => {
  log(`getPageWithCaching, url=${url}`);
  const i = findInPageCache(url);
  if (i > -1) {
    const page = pages[i];
    fakeDownload(url, owner.idNumber, onComplete, page.data, page.lastModified, owner);
    return;
  }
  const d = getPage(url, onComplete, owner);
  owner.downloads.add(d);
  d.owner = owner;
};

registerSlotFiller("original.popupImage", (x) => {
  log(`original.popupImage, x.article=${String(x.article)}, x.navpop?.idNumber=${String(x.navpop.idNumber)}`);
  return imageHTML(x.navpop.idNumber);
});
const loadImage = (image, navpop) => {
  if (typeof image.stripNamespace !== "function") {
    alert("loadImages bad");
  }
  if (!getValueOf("popupImages")) {
    return;
  }
  if (!isValidImageName(image)) {
    return false;
  }
  const art = image.urlString();
  let url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query`;
  url += `&prop=imageinfo&iiprop=url|mime&iiurlwidth=${getValueOf("popupImageSizeLarge")}`;
  url += `&titles=${art}`;
  pendingNavpopTask(navpop);
  const callback = (d) => {
    popupsInsertImage(navpop.idNumber, navpop, d);
  };
  const go = () => {
    getPageWithCaching(url, callback, navpop);
    return true;
  };
  if (navpop.visible || !getValueOf("popupLazyDownloads")) {
    go();
  } else {
    navpop.addHook(go, "unhide", "after", "DOWNLOAD_IMAGE_QUERY_DATA");
  }
  return void 0;
};
const popupsInsertImage = (id, _navpop, download) => {
  log("popupsInsertImage");
  let imageinfo;
  try {
    const jsObj = getJsObj(download.data ?? "");
    const imagepage = assume$2(anyChild(jsObj.query.pages));
    if (typeof imagepage.imageinfo === "undefined") {
      return;
    }
    imageinfo = assume$2(imagepage.imageinfo)[0];
  } catch {
    log("popupsInsertImage failed :(");
    return;
  }
  const popupImage = document.getElementById(`popupImg${String(id)}`);
  if (!popupImage) {
    log("could not find insertion point for image");
    return;
  }
  popupImage.width = +getValueOf("popupImageSize");
  popupImage.style.display = "inline";
  if (imageinfo.thumburl) {
    popupImage.src = imageinfo.thumburl;
  } else if (imageinfo.mime.startsWith("image")) {
    popupImage.src = imageinfo.url;
    log("a thumb could not be found, using original image");
  } else {
    log("fullsize imagethumb, but not sure if it's an image");
  }
  const a = document.getElementById(`popupImageLink${String(id)}`);
  if (a === null) {
    return null;
  }
  switch (getValueOf("popupThumbAction")) {
    case "imagepage": {
      if (eventsState.current.article && eventsState.current.article.namespaceId() !== nsState.imageId) {
        a.href = imageinfo.descriptionurl;
        popTipsSoonFn(`popupImg${String(id)}`)();
        break;
      }
      a.onclick = toggleSize;
      a.title = popupString("Toggle image size");
      return;
    }
    case "sizetoggle":
      a.onclick = toggleSize;
      a.title = popupString("Toggle image size");
      return;
    case "linkfull":
      a.href = imageinfo.url;
      a.title = popupString("Open full-size image");
      return;
  }
  return void 0;
};
function toggleSize() {
  const imgContainer = this;
  const img = imgContainer.firstChild;
  if (!img) {
    alert("img is null :/");
    return;
  }
  if (!img.style.width || img.style.width === "") {
    img.style.width = "100%";
  } else {
    img.style.width = "";
  }
}
const getValidImageFromWikiText = (wikiText) => {
  let matched = null;
  const t = removeMatchesUnless(wikiText, /(<!--[\s\S]*?-->)/, 1, /^<!--[^[]*popup/i);
  let match = assume$2(wiki.re.image).exec(t);
  while (match) {
    const m = match[2] || match[6];
    if (isValidImageName(m)) {
      matched = m;
      break;
    }
    match = assume$2(wiki.re.image).exec(t);
  }
  assume$2(wiki.re.image).lastIndex = 0;
  if (!matched) {
    return null;
  }
  return `${mw.config.get("wgFormattedNamespaces")[nsState.imageId]}:${upcaseFirst(matched)}`;
};
const removeMatchesUnless = (str, re1, parencount, re2) => {
  const split = parenSplit(str, re1);
  const c = parencount + 1;
  for (let i = 0; i < split.length; ++i) {
    if (i % c === 0 || re2.test(split[i])) {
      continue;
    }
    split[i] = "";
  }
  return split.join("");
};

class Previewmaker {
  constructor(wikiText, baseUrl, owner) {
    this.maxCharacters = +getValueOf("popupMaxPreviewCharacters");
    this.maxSentences = +getValueOf("popupMaxPreviewSentences");
    this.fullLength = 0;
    this.makeRegexp = (x, _prefix) => {
      const prefix = _prefix ?? "";
      let reStr;
      let flags = "";
      if (typeof x === "string") {
        reStr = prefix + literalizeRegex(x);
      } else {
        let s = x.toString().substring(1);
        const sp = s.split("/");
        flags = sp[sp.length - 1];
        sp[sp.length - 1] = "";
        s = sp.join("/");
        s = s.substring(0, s.length - 1);
        reStr = prefix + s;
      }
      log(`makeRegexp: got reStr=${reStr}, flags=${flags}`);
      return RegExp(reStr, flags);
    };
    this.firstSentences = (strs, howmany) => {
      const t = strs.slice(0, 2 * howmany);
      return t.join("");
    };
    this.esWiki2HtmlPart = (data) => {
      const reLinks = /(?:\[\[([^|\]]*)(?:\|([^|\]]*))*]]([a-z]*))/gi;
      reLinks.lastIndex = 0;
      let result = "";
      let postfixIndex = 0;
      let match = reLinks.exec(data);
      while (match) {
        result += `${escapeQuotesHTML(data.substring(postfixIndex, match.index))}<a href="${instaConf.paths.articles}${escapeQuotesHTML(match[1])}">${escapeQuotesHTML((match[2] ? match[2] : match[1]) + match[3])}</a>`;
        postfixIndex = reLinks.lastIndex;
        match = reLinks.exec(data);
      }
      result += escapeQuotesHTML(data.substring(postfixIndex));
      return result;
    };
    this.originalData = wikiText;
    this.baseUrl = baseUrl;
    this.owner = owner;
    this.setData();
  }
  setData() {
    const maxSize = Math.max(1e4, 2 * this.maxCharacters);
    this.data = this.originalData.substring(0, maxSize);
  }
  killComments() {
    this.data = this.data.replace(/^<!--[^$]*?-->\n|\n<!--[^$]*?-->(?=\n)|<!--[^$]*?-->/g, "");
  }
  killDivs() {
    this.data = this.data.replace(/< *div[^>]* *>[\s\S]*?< *\/ *div *>/ig, "");
  }
  killGalleries() {
    this.data = this.data.replace(/< *gallery[^>]* *>[\s\S]*?< *\/ *gallery *>/ig, "");
  }
  kill(opening, closing, subopening, subclosing, repl) {
    let oldk = this.data;
    let k = this.killStuff(this.data, opening, closing, subopening, subclosing, repl);
    while (k.length < oldk.length) {
      oldk = k;
      k = this.killStuff(k, opening, closing, subopening, subclosing, repl);
    }
    this.data = k;
  }
  killStuff(_txt, opening, closing, subopening, subclosing, repl) {
    let txt = _txt;
    const op = this.makeRegexp(opening);
    const cl = this.makeRegexp(closing, "^");
    const sb = subopening ? this.makeRegexp(subopening, "^") : null;
    const sc = subclosing ? this.makeRegexp(subclosing, "^") : cl;
    if (!op.test(txt)) {
      return txt;
    }
    const opResult = assume$2(op.exec(txt));
    const ret = txt.substring(0, opResult.index);
    txt = txt.substring(opResult.index + opResult[0].length);
    let depth = 1;
    while (txt.length > 0) {
      let removal = 0;
      if (depth === 1 && cl.test(txt)) {
        depth--;
        removal = assume$2(cl.exec(txt))[0].length;
      } else if (depth > 1 && sc.test(txt)) {
        depth--;
        removal = assume$2(sc.exec(txt))[0].length;
      } else if (sb?.test(txt)) {
        depth++;
        removal = assume$2(sb.exec(txt))[0].length;
      }
      if (!removal) {
        removal = 1;
      }
      txt = txt.substring(removal);
      if (depth === 0) {
        break;
      }
    }
    return ret + (repl ?? "") + txt;
  }
  killBoxTemplates() {
    this.kill(/[{][{][^{}\s|]*?(float|box)[_ ](begin|start)/i, /[}][}]\s*/, "{{");
    this.kill(/[{][{][^{}\s|]*?(infobox|elementbox|frame)[_ ]/i, /[}][}]\s*/, "{{");
  }
  killTemplates() {
    this.kill("{{", "}}", "{", "}", " ");
  }
  killTables() {
    this.kill("{|", /[|]}\s*/, "{|");
    this.kill(/<table.*?>/i, /<\/table.*?>/i, /<table.*?>/i);
    this.data = this.data.replace(RegExp("^[|].*$", "mg"), "");
  }
  killImages() {
    const forbiddenNamespaceAliases = [];
    for (const [localizedNamespaceLc, namespaceId] of Object.entries(mw.config.get("wgNamespaceIds"))) {
      if (namespaceId !== nsState.imageId && namespaceId !== nsState.categoryId) {
        continue;
      }
      forbiddenNamespaceAliases.push(localizedNamespaceLc.split(" ").join("[ _]"));
    }
    this.kill(RegExp(`[[][[]\\s*(${forbiddenNamespaceAliases.join("|")})\\s*:`, "i"), /\]\]\s*/, "[", "]");
  }
  killHTML() {
    this.kill(/<ref\b[^/>]*?>/i, /<\/ref>/i);
    this.data = this.data.replace(/(^|\n) *<.*/g, "\n");
    const splitted = parenSplit(this.data, /(<[\w\W]*?(?:>|$|(?=<)))/);
    const len = splitted.length;
    for (let i = 1; i < len; i = i + 2) {
      switch (splitted[i]) {
        case "<nowiki>":
        case "</nowiki>":
        case "<blockquote>":
        case "</blockquote>":
          break;
        default:
          splitted[i] = "";
      }
    }
    this.data = splitted.join("");
  }
  killChunks() {
    const italicChunkRegex = /((^|\n)\s*:*\s*''[^']([^']|'''|'[^']){20}(.|\n[^\n])*''[.!?\s]*\n)+/g;
    this.data = this.data.replace(italicChunkRegex, "\n");
  }
  mopup() {
    this.data = this.data.replace(/^-{4,}/mg, "");
    this.data = this.data.replace(/(^|\n) *:[^\n]*/g, "");
    this.data = this.data.replace(/^__[A-Z_]*__ *$/img, "");
  }
  firstBit() {
    let d = this.data;
    if (getValueOf("popupPreviewCutHeadings")) {
      this.data = this.data.replace(/\s*(==+[^=]*==+)\s*/g, "\n\n$1 ");
      this.data = this.data.replace(/([:;]) *\n{2,}/g, "$1\n");
      this.data = this.data.replace(/^[\s\n]*/, "");
      d = assume$2(/^([^\n]|\n[^\n\s])*/.exec(this.data))[0];
      if (!getValueOf("popupPreviewFirstParOnly")) {
        d = this.data;
      }
      d = d.replace(/(==+[^=]*==+)\s*/g, "$1\n\n");
    }
    d = parenSplit(d, /([!?.]+["']*\s)/g);
    d[0] = d[0].replace(/^\s*/, "");
    const notSentenceEnds = /([^.][a-z][.] *[a-z]|etc|sic|Dr|Mr|Mrs|Ms|St|no|op|cit|\[[^\]]*|\s[A-Zvclm])$/i;
    d = this.fixSentenceEnds(d, notSentenceEnds);
    this.fullLength = d.join("").length;
    let n = this.maxSentences;
    let dd;
    do {
      dd = this.firstSentences(d, n);
      --n;
    } while (dd.length > this.maxCharacters && n !== 0);
    this.data = dd;
  }
  fixSentenceEnds(strs, reg) {
    for (let i = 0; i < strs.length - 2; ++i) {
      if (reg.test(strs[i])) {
        const a = [];
        for (let j = 0; j < strs.length; ++j) {
          if (j < i) {
            a[j] = strs[j];
          }
          if (j === i) {
            a[i] = strs[i] + strs[i + 1] + strs[i + 2];
          }
          if (j > i + 2) {
            a[j - 2] = strs[j];
          }
        }
        return this.fixSentenceEnds(a, reg);
      }
    }
    return strs;
  }
  killBadWhitespace() {
    this.data = this.data.replace(/^ *'+ *$/gm, "");
  }
  makePreview() {
    if (this.owner?.article?.namespaceId() !== nsState.templateId && this.owner?.article?.namespaceId() !== nsState.imageId) {
      this.killComments();
      this.killDivs();
      this.killGalleries();
      this.killBoxTemplates();
      if (getValueOf("popupPreviewKillTemplates")) {
        this.killTemplates();
      } else {
        this.killMultilineTemplates();
      }
      this.killTables();
      this.killImages();
      this.killHTML();
      this.killChunks();
      this.mopup();
      this.firstBit();
      this.killBadWhitespace();
    } else {
      this.killHTML();
    }
    this.html = wiki2html(this.data, this.baseUrl);
    this.fixHTML();
    this.stripLongTemplates();
  }
  editSummaryPreview() {
    const reAes = /\/\* *(.*?) *\*\//g;
    reAes.lastIndex = 0;
    const match = reAes.exec(this.data);
    if (match) {
      const prefix = this.data.substring(0, match.index - 1);
      const section = match[1];
      const postfix = this.data.substring(reAes.lastIndex);
      let start = "<span class='autocomment'>";
      let end = "</span>";
      if (prefix.length > 0) {
        start = `${this.esWiki2HtmlPart(prefix)} ${start}- `;
      }
      if (postfix.length > 0) {
        end = `: ${end}${this.esWiki2HtmlPart(postfix)}`;
      }
      const t = new Title().fromURL(this.baseUrl);
      t.anchorFromUtf(section);
      const sectionLink = `${instaConf.paths.articles + escapeQuotesHTML(t.toString(true))}#${escapeQuotesHTML(t.anchor)}`;
      return `${start}<a href="${sectionLink}">&rarr;</a> ${escapeQuotesHTML(section)}${end}`;
    }
    return this.esWiki2HtmlPart(this.data);
  }
  fixHTML() {
    if (!this.html) {
      return;
    }
    let ret = this.html;
    ret = ret.replace(RegExp(`(<a href="${instaConf.paths.articles}[^"]*)[?](.*?")`, "g"), "$1%3F$2");
    ret = ret.replace(RegExp(`(<a href='${instaConf.paths.articles}[^']*)[?](.*?')`, "g"), "$1%3F$2");
    this.html = ret;
  }
  showPreview() {
    this.makePreview();
    if (RegExp("^\\s*$").test(assume$2(this.html))) {
      return;
    }
    setPopupHTML("<hr />", "popupPrePreviewSep", this.owner?.idNumber);
    setPopupTipsAndHTML(this.html, "popupPreview", this.owner?.idNumber, this.owner ? { owner: this.owner } : void 0);
    const more = this.fullLength > this.data.length ? this.moreLink() : "";
    setPopupHTML(more, "popupPreviewMore", this.owner?.idNumber);
  }
  moreLink() {
    const a = document.createElement("a");
    a.className = "popupMoreLink";
    a.innerHTML = popupString("more...");
    a.onclick = () => {
      this.maxCharacters += 2e3;
      this.maxSentences += 20;
      this.setData();
      this.showPreview();
    };
    return a;
  }
  stripLongTemplates() {
    this.html = assume$2(this.html).replace(/^.{0,1000}[{][{][^}]*?(<(p|br)( \/)?>\s*){2,}([^{}]*?[}][}])?/ig, "");
    this.html = assume$2(this.html).split("\n").join(" ");
    this.html = assume$2(this.html).replace(/[{][{][^}]*<pre>[^}]*[}][}]/ig, "");
  }
  killMultilineTemplates() {
    this.kill("{{{", "}}}");
    this.kill(/\s*[{][{][^{}]*\n/, "}}", "{{");
  }
}

const wikiLink = (l) => {
  if (!(typeof l.article === typeof {} && typeof l.action === "string" && typeof l.text === "string")) {
    return null;
  }
  if (typeof l.oldid === "undefined") {
    l.oldid = null;
  }
  const savedOldid = l.oldid;
  if (!/^(edit|view|revert|render)$|^raw/.test(assume$2(l.action))) {
    l.oldid = null;
  }
  let hint = popupString(`${String(l.action)}Hint`);
  const oldidData = [l.oldid, safeDecodeURI(l.article)];
  let revisionString = tprintf("revision %s of %s", oldidData);
  log(`revisionString=${revisionString}`);
  switch (l.action) {
    case "edit&section=new":
      hint = popupString("newSectionHint");
      break;
    case "edit&undo=":
      if (l.diff && l.diff !== "prev" && savedOldid) {
        l.action = `${l.action}${l.diff}&undoafter=${savedOldid}`;
      } else if (savedOldid) {
        l.action = `${l.action}${savedOldid}`;
      }
      hint = popupString("undoHint");
      break;
    case "raw&ctype=text/css":
      hint = popupString("rawHint");
      break;
    case "revert": {
      const p = parseParams(eventsState.current.link?.href ?? "");
      l.action = `edit&autoclick=wpSave&actoken=${autoClickToken()}&autoimpl=${popupString("autoedit_version")}&autosummary=${revertSummary(l.oldid, p.diff)}`;
      if (p.diff === "prev") {
        l.action += "&direction=prev";
        revisionString = tprintf("the revision prior to revision %s of %s", oldidData);
      }
      if (getValueOf("popupRevertSummaryPrompt")) {
        l.action += "&autosummaryprompt=true";
      }
      if (getValueOf("popupMinorReverts")) {
        l.action += "&autominor=true";
      }
      log(`revisionString is now ${revisionString}`);
      break;
    }
    case "nullEdit":
      l.action = `edit&autoclick=wpSave&actoken=${autoClickToken()}&autoimpl=${popupString("autoedit_version")}&autosummary=${popupString("nullEditSummary")}`;
      break;
    case "historyfeed":
      l.action = "history&feed=rss";
      break;
    case "markpatrolled":
      l.action = `markpatrolled&rcid=${String(l.rcid)}`;
  }
  if (hint) {
    if (l.oldid) {
      hint = simplePrintf(hint, [revisionString]);
    } else {
      hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
    }
  } else {
    hint = String(safeDecodeURI(`${String(l.article)}&action=${String(l.action)}`)) + String(l.oldid) ? `&oldid=${String(l.oldid)}` : "";
  }
  return titledWikiLink({
    article: l.article,
    action: l.action,
    text: l.text,
    newWin: l.newWin,
    title: hint,
    oldid: l.oldid,
    noPopup: l.noPopup,
    onclick: l.onclick
  });
};
const revertSummary = (oldid, diff) => {
  let ret;
  if (diff === "prev") {
    ret = getValueOf("popupQueriedRevertToPreviousSummary");
  } else {
    ret = getValueOf("popupQueriedRevertSummary");
  }
  return `${ret}&autorv=${String(oldid)}`;
};
const titledWikiLink = (l) => {
  if (typeof l.article === "undefined" || typeof l.action === "undefined") {
    errlog("got undefined article or action in titledWikiLink");
    return null;
  }
  const base = wiki.titlebase + l.article.urlString();
  let url = base;
  if (typeof l.actionName === "undefined" || !l.actionName) {
    l.actionName = "action";
  }
  if (l.action !== "view") {
    url = `${base}&${l.actionName}=${l.action}`;
  }
  if (l.action === "edit") {
    url += "&wpChangeTags=Popups%2CAutomation%20tool";
  }
  if (typeof l.oldid !== "undefined" && l.oldid) {
    url += `&oldid=${l.oldid}`;
  }
  let cssClass = wiki.misc.defaultNavlinkClassname;
  if (typeof l.className !== "undefined" && l.className) {
    cssClass = l.className;
  }
  return generalNavLink({
    url,
    newWin: l.newWin,
    title: typeof l.title !== "undefined" ? l.title : null,
    text: typeof l.text !== "undefined" ? l.text : null,
    className: cssClass,
    noPopup: l.noPopup,
    onclick: l.onclick
  });
};
const generalLink = (link) => {
  if (typeof link.url === "undefined") {
    return null;
  }
  const elem = document.createElement("a");
  elem.href = link.url;
  elem.title = String(link.title);
  elem.setAttribute("onclick", String(link.onclick));
  if (link.noPopup) {
    elem.setAttribute("noPopup", "1");
  }
  let newWin;
  if (typeof link.newWin === "undefined" || link.newWin === null) {
    newWin = getValueOf("popupNewWindows");
  } else {
    newWin = link.newWin;
  }
  if (newWin) {
    elem.target = "_blank";
  }
  if (link.className) {
    elem.className = link.className;
  }
  elem.innerText = unescapeQuotesHTML(String(link.text));
  return elem.outerHTML;
};
const appendParamsToLink = (linkstr, params) => {
  if (!linkstr) {
    return null;
  }
  const sp = parenSplit(linkstr, /(href="[^"]+?)"/i);
  if (sp.length < 2) {
    return null;
  }
  let ret = (sp.shift() ?? "") + (sp.shift() ?? "");
  ret += `&${params}"`;
  ret += sp.join("");
  return ret;
};
const changeLinkTargetLink = (x) => {
  if (x.newTarget) {
    log(`changeLinkTargetLink: newTarget=${x.newTarget}`);
  }
  if (x.oldTarget !== decodeURIComponent(x.oldTarget)) {
    log(`This might be an input problem: ${x.oldTarget}`);
  }
  const cA = mw.util.escapeRegExp(x.oldTarget);
  let chs = cA.charAt(0).toUpperCase();
  chs = `[${chs}${chs.toLowerCase()}]`;
  let currentArticleRegexBit = chs + cA.substring(1);
  currentArticleRegexBit = currentArticleRegexBit.split(/(?:[_ ]+|%20)/g).join("(?:[_ ]+|%20)").split("\\(").join("(?:%28|\\()").split("\\)").join("(?:%29|\\))");
  currentArticleRegexBit = `\\s*(${currentArticleRegexBit}(?:#[^\\[\\|]*)?)\\s*`;
  const title = x.title || mw.config.get("wgPageName").split("_").join(" ");
  const lk = titledWikiLink({
    article: new Title(title),
    newWin: x.newWin,
    action: "edit",
    text: x.text,
    title: x.hint,
    className: "popup_change_title_link"
  });
  let cmd = "";
  if (x.newTarget) {
    const t = x.newTarget;
    const s = mw.util.escapeRegExp(x.newTarget);
    if (x.alsoChangeLabel) {
      cmd += `s~\\[\\[${currentArticleRegexBit}\\]\\]~[[${t}]]~g;`;
      cmd += `s~\\[\\[${currentArticleRegexBit}[|]~[[${t}|~g;`;
      cmd += `s~\\[\\[${s}\\|${s}\\]\\]~[[${t}]]~g`;
    } else {
      cmd += `s~\\[\\[${currentArticleRegexBit}\\]\\]~[[${t}|$1]]~g;`;
      cmd += `s~\\[\\[${currentArticleRegexBit}[|]~[[${t}|~g;`;
      cmd += `s~\\[\\[${s}\\|${s}\\]\\]~[[${t}]]~g`;
    }
  } else {
    cmd += `s~\\[\\[${currentArticleRegexBit}\\]\\]~$1~g;`;
    cmd += `s~\\[\\[${currentArticleRegexBit}[|](.*?)\\]\\]~$2~g`;
  }
  cmd = `autoedit=${encodeURIComponent(cmd)}`;
  cmd += `&autoclick=${encodeURIComponent(x.clickButton)}&actoken=${encodeURIComponent(autoClickToken())}`;
  cmd += x.minor === null ? "" : `&autominor=${encodeURIComponent(String(x.minor))}`;
  cmd += x.watch === null ? "" : `&autowatch=${encodeURIComponent(String(x.watch))}`;
  cmd += `&autosummary=${encodeURIComponent(x.summary)}`;
  cmd += `&autoimpl=${encodeURIComponent(popupString("autoedit_version"))}`;
  return appendParamsToLink(lk, cmd);
};
const redirLink = (redirMatch, article) => {
  let ret = "";
  if (getValueOf("popupAppendRedirNavLinks") && getValueOf("popupNavLinks")) {
    ret += "<hr />";
    if (getValueOf("popupFixRedirs")) {
      ret += popupString("Redirects to: (Fix ");
      log(`redirLink: newTarget=${String(redirMatch)}`);
      ret += String(addPopupShortcut(changeLinkTargetLink({
        newTarget: redirMatch,
        text: popupString("target"),
        hint: popupString("Fix this redirect, changing just the link target"),
        summary: simplePrintf(getValueOf("popupFixRedirsSummary"), [article.toString(), redirMatch]),
        oldTarget: article.toString(),
        clickButton: getValueOf("popupRedirAutoClick"),
        minor: true,
        watch: getValueOf("popupWatchRedirredPages")
      }), "R"));
      ret += popupString(" or ");
      ret += String(addPopupShortcut(changeLinkTargetLink({
        newTarget: redirMatch,
        text: popupString("target & label"),
        hint: popupString("Fix this redirect, changing the link target and label"),
        summary: simplePrintf(getValueOf("popupFixRedirsSummary"), [article.toString(), redirMatch]),
        oldTarget: article.toString(),
        clickButton: getValueOf("popupRedirAutoClick"),
        minor: true,
        watch: getValueOf("popupWatchRedirredPages"),
        alsoChangeLabel: true
      }), "R"));
      ret += popupString(")");
    } else {
      ret += popupString("Redirects") + popupString(" to ");
    }
    return ret;
  }
  return `<br> ${popupString("Redirects")}${popupString(" to ")}${String(titledWikiLink({
    article: new Title().fromWikiText(redirMatch),
    action: "view",
    text: safeDecodeURI(redirMatch),
    title: popupString("Bypass redirect")
  }))}`;
};
const generalNavLink = (l) => {
  l.className = l.className === null ? "popupNavLink" : l.className;
  return generalLink(l);
};
const arinLink = (l) => {
  if (!saneLinkCheck(l)) {
    return null;
  }
  if (!l.article.isIpUser() || !siteState.wikimedia) {
    return null;
  }
  const uN = l.article.userName();
  return generalNavLink({
    url: `http://ws.arin.net/cgi-bin/whois.pl?queryinput=${encodeURIComponent(String(uN))}`,
    newWin: l.newWin,
    title: tprintf("Look up %s in ARIN whois database", [uN]),
    text: l.text,
    noPopup: 1
  });
};
const toolDbName = (cookieStyle) => {
  let ret = mw.config.get("wgDBname");
  {
    ret += "_p";
  }
  return ret;
};
const saneLinkCheck = (l) => {
  if (typeof l.article !== typeof {} || typeof l.text !== "string") {
    return false;
  }
  return true;
};
const editCounterLink = (l) => {
  if (!saneLinkCheck(l)) {
    return null;
  }
  if (!siteState.wikimedia) {
    return null;
  }
  const uN = l.article.userName();
  const tool = getValueOf("popupEditCounterTool");
  let url;
  const defaultToolUrl = `https://xtools.wmflabs.org/ec?user=$1&project=$2.$3&uselang=${mw.config.get("wgUserLanguage")}`;
  switch (tool) {
    case "custom":
      url = simplePrintf(getValueOf("popupEditCounterUrl"), [encodeURIComponent(String(uN)), toolDbName()]);
      break;
    case "soxred":
    case "kate":
    case "interiot":
    case "supercount":
    default: {
      const theWiki = siteState.hostname.split(".");
      url = simplePrintf(defaultToolUrl, [encodeURIComponent(String(uN)), theWiki[0], theWiki[1]]);
    }
  }
  return generalNavLink({
    url,
    title: tprintf("editCounterLinkHint", [uN]),
    newWin: l.newWin,
    text: l.text,
    noPopup: 1
  });
};
const globalSearchLink = (l) => {
  if (!saneLinkCheck(l)) {
    return null;
  }
  const base = `https://global-search.toolforge.org/?uselang=${mw.config.get("wgUserLanguage")}&q=`;
  const article = l.article.urlString({
    keepSpaces: true
  });
  return generalNavLink({
    url: base + article,
    newWin: l.newWin,
    title: tprintf("globalSearchHint", [safeDecodeURI(l.article)]),
    text: l.text,
    noPopup: 1
  });
};
const googleLink = (l) => {
  if (!saneLinkCheck(l)) {
    return null;
  }
  const base = "https://www.google.com/search?q=";
  const article = l.article.urlString({
    keepSpaces: true
  });
  return generalNavLink({
    url: `${base}%22${article}%22`,
    newWin: l.newWin,
    title: tprintf("googleSearchHint", [safeDecodeURI(l.article)]),
    text: l.text,
    noPopup: 1
  });
};
const editorListLink = (l) => {
  if (!saneLinkCheck(l)) {
    return null;
  }
  const article = l.article.articleFromTalkPage() ?? l.article;
  const url = `https://xtools.wmflabs.org/articleinfo/${encodeURI(siteState.hostname)}/${article.urlString()}?uselang=${mw.config.get("wgUserLanguage")}`;
  return generalNavLink({
    url,
    title: tprintf("editorListHint", [article]),
    newWin: l.newWin,
    text: l.text,
    noPopup: 1
  });
};
const getLastContrib = (wikipage, newWin) => {
  getHistoryInfo(wikipage, (x) => {
    processLastContribInfo(x, {
      page: wikipage,
      newWin
    });
  });
};
const processLastContribInfo = (info, stuff) => {
  if (!info.edits.length) {
    alert("Popups: an odd thing happened. Please retry.");
    return;
  }
  if (!info.firstNewEditor) {
    alert(tprintf("Only found one editor: %s made %s edits", [info.edits[0].editor, info.edits.length]));
    return;
  }
  const newUrl = `${wiki.titlebase + new Title(stuff.page).urlString()}&diff=cur&oldid=${String(info.firstNewEditor.oldid)}`;
  displayUrl(newUrl, stuff.newWin);
};
const getDiffSinceMyEdit = (wikipage, newWin) => {
  getHistoryInfo(wikipage, (x) => {
    processDiffSinceMyEdit(x, {
      page: wikipage,
      newWin
    });
  });
};
const processDiffSinceMyEdit = (info, stuff) => {
  if (!info.edits.length) {
    alert("Popups: something fishy happened. Please try again.");
    return;
  }
  const friendlyName = stuff.page.split("_").join(" ");
  if (!info.myLastEdit) {
    alert(tprintf("Couldn't find an edit by %s\nin the last %s edits to\n%s", [info.userName, getValueOf("popupHistoryLimit"), friendlyName]));
    return;
  }
  if (info.myLastEdit.index === 0) {
    alert(tprintf("%s seems to be the last editor to the page %s", [info.userName, friendlyName]));
    return;
  }
  const newUrl = `${wiki.titlebase + new Title(stuff.page).urlString()}&diff=cur&oldid=${String(info.myLastEdit.oldid)}`;
  displayUrl(newUrl, stuff.newWin);
};
const displayUrl = (url, newWin) => {
  if (newWin) {
    window.open(url);
  } else {
    document.location.href = url;
  }
};
const purgePopups = () => {
  processAllPopups(true);
  clearPages();
  for (const key of Object.keys(optionStore)) {
    Reflect.deleteProperty(optionStore, key);
  }
  abortAllDownloads();
};
const processAllPopups = (nullify, banish) => {
  for (const link of eventsState.current.links) {
    if (!link.navpopup) {
      continue;
    }
    if (nullify || banish) {
      assume$2(link.navpopup).banish();
    }
    link.simpleNoMore = false;
    if (nullify) {
      link.navpopup = null;
    }
  }
};
const disablePopups = () => {
  processAllPopups(false, true);
  setupTooltips(null, true);
};
const togglePreviews = () => {
  processAllPopups(true, true);
  optionStore.simplePopups = !optionStore.simplePopups;
  abortAllDownloads();
};
function magicWatchLink(l) {
  l.onclick = simplePrintf("pg.fn.modifyWatchlist('%s','%s');return false;", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), this.id]);
  return wikiLink(l);
}
const modifyWatchlist = async (title, action) => {
  const reqData = {
    action: "watch",
    formatversion: 2,
    titles: title ?? "",
    uselang: mw.config.get("wgUserLanguage")
  };
  if (action === "unwatch") {
    reqData.unwatch = true;
  }
  const mwTitle = mw.Title.newFromText(title ?? "");
  let messageName;
  if (mwTitle && mwTitle.getNamespaceId() > 0 && mwTitle.getNamespaceId() % 2 === 1) {
    messageName = action === "watch" ? "addedwatchtext-talk" : "removedwatchtext-talk";
  } else {
    messageName = action === "watch" ? "addedwatchtext" : "removedwatchtext";
  }
  await Promise.all([
    getMwApi().postWithToken("watch", reqData),
    // mw.loader.using(["mediawiki.jqueryMsg"]),
    getMwApi().loadMessagesIfMissing([messageName])
  ]);
  mw.notify(mw.message(messageName, title ?? "").parseDom());
};
const magicHistoryLink = (l) => {
  let title = "", onClick = "";
  switch (l.id) {
    case "lastContrib":
      onClick = simplePrintf("pg.fn.getLastContrib('%s',%s)", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), l.newWin]);
      title = popupString("lastContribHint");
      break;
    case "sinceMe":
      onClick = simplePrintf("pg.fn.getDiffSinceMyEdit('%s',%s)", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), l.newWin]);
      title = popupString("sinceMeHint");
      break;
  }
  const jsUrl = `javascript:${onClick}`;
  onClick += ";return false;";
  return generalNavLink({
    url: jsUrl,
    newWin: false,
    title,
    text: l.text,
    noPopup: l.noPopup,
    onclick: onClick
  });
};
const popupMenuLink = (l) => {
  const jsUrl = simplePrintf("javascript:pg.fn.%s()", [l.id]);
  const title = popupString(simplePrintf("%sHint", [l.id]));
  const onClick = simplePrintf("pg.fn.%s();return false;", [l.id]);
  return generalNavLink({
    url: jsUrl,
    newWin: false,
    title,
    text: l.text,
    noPopup: l.noPopup,
    onclick: onClick
  });
};
const specialLink = (l) => {
  if (typeof l.specialpage === "undefined" || !l.specialpage) {
    return null;
  }
  const base = `${wiki.titlebase + mw.config.get("wgFormattedNamespaces")[nsState.specialId]}:${l.specialpage}`;
  if (typeof l.sep === "undefined" || l.sep === null) {
    l.sep = "&target=";
  }
  let article = l.article.urlString({
    keepSpaces: l.specialpage === "Search"
  });
  let hint = popupString(`${l.specialpage}Hint`);
  switch (l.specialpage) {
    case "Log":
      switch (l.sep) {
        case "&user=":
          hint = popupString("userLogHint");
          break;
        case "&type=block&page=":
          hint = popupString("blockLogHint");
          break;
        case "&page=":
          hint = popupString("pageLogHint");
          break;
        case "&type=protect&page=":
          hint = popupString("protectLogHint");
          break;
        case "&type=delete&page=":
          hint = popupString("deleteLogHint");
          break;
        default:
          log(`Unknown log type, sep=${l.sep}`);
          hint = "Missing hint (FIXME)";
      }
      break;
    case "PrefixIndex":
      article += "/";
      break;
  }
  if (hint) {
    hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
  } else {
    hint = safeDecodeURI(`${l.specialpage}:${String(l.article)}`);
  }
  const url = base + l.sep + article;
  return generalNavLink({
    url,
    title: hint,
    text: l.text,
    newWin: l.newWin,
    noPopup: l.noPopup
  });
};
const getHistoryInfo = (wikipage, whatNext) => {
  log("getHistoryInfo");
  getHistory(wikipage, whatNext ? (d) => {
    whatNext(processHistory(d));
  } : processHistory);
};
const getHistory = (wikipage, onComplete) => {
  log("getHistory");
  const url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query&prop=revisions&titles=${new Title(wikipage).urlString()}&rvlimit=${getValueOf("popupHistoryLimit")}`;
  log(`getHistory: url=${url}`);
  return startDownload(url, `${eventsState.idNumber}history`, onComplete);
};
const processHistory = (download) => {
  const jsobj = getJsObj(download.data ?? "");
  try {
    const page = anyChild(jsobj.query?.pages ?? {});
    const revisions = page?.revisions;
    if (!revisions) {
      log("Something went wrong with JSON business");
      return finishProcessHistory([], mw.config.get("wgUserName"));
    }
    const edits = [];
    for (const revision of revisions) {
      edits.push({
        oldid: revision.revid,
        editor: revision.user
      });
    }
    log(`processed ${edits.length} edits`);
    return finishProcessHistory(edits, mw.config.get("wgUserName"));
  } catch {
    log("Something went wrong with JSON business");
    return finishProcessHistory([], mw.config.get("wgUserName"));
  }
};
const finishProcessHistory = (edits, userName) => {
  const histInfo = {
    edits,
    userName
  };
  for (let i = 0; i < edits.length; ++i) {
    if (typeof histInfo.myLastEdit === "undefined" && userName && edits[i].editor === userName) {
      histInfo.myLastEdit = {
        index: i,
        oldid: edits[i].oldid,
        previd: i === 0 ? null : edits[i - 1].oldid
      };
    }
    if (typeof histInfo.firstNewEditor === "undefined" && edits[i].editor !== edits[0].editor) {
      histInfo.firstNewEditor = {
        index: i,
        oldid: edits[i].oldid,
        // firstNewEditor 必在 i > 0 时成立（i=0 的编者即 edits[0].editor，
        // 条件必假），故三元 null 侧结构性不可达；照搬勿修
        previd: i === 0 ? (
          /* istanbul ignore next -- 同上，null 侧结构性不可达 */
          null
        ) : edits[i - 1].oldid
      };
    }
  }
  return histInfo;
};

const retargetDab = (newTarget, oldTarget, friendlyCurrentArticleName, titleToEdit) => {
  log(`retargetDab: newTarget=${newTarget} oldTarget=${String(oldTarget)}`);
  return assume$2(changeLinkTargetLink({
    newTarget,
    text: newTarget.split(" ").join("&nbsp;"),
    hint: tprintf("disambigHint", [newTarget]),
    summary: simplePrintf(getValueOf("popupFixDabsSummary"), [friendlyCurrentArticleName, newTarget]),
    clickButton: getValueOf("popupDabsAutoClick"),
    minor: true,
    oldTarget,
    watch: getValueOf("popupWatchDisambiggedPages"),
    title: titleToEdit
  }));
};
const listLinks = (wikitext, oldTarget, titleToEdit) => {
  const reg = RegExp("\\[\\[([^|]*?) *(\\||\\]\\])", "gi");
  let ret = [];
  const splitted = parenSplit(wikitext, reg);
  const omitRegex = RegExp("^[a-z]*:|^[Ss]pecial:|^[Ii]mage|^[Cc]ategory");
  const friendlyCurrentArticleName = String(oldTarget);
  const wikPos = getValueOf("popupDabWiktionary");
  for (let i = 1; i < splitted.length; i = i + 3) {
    if (typeof splitted[i] === "string" && splitted[i].length > 0 && !omitRegex.test(splitted[i])) {
      ret.push(retargetDab(splitted[i], oldTarget, friendlyCurrentArticleName, titleToEdit));
    }
  }
  ret = rmDupesFromSortedList(ret.sort());
  if (wikPos) {
    const wikTarget = `wiktionary:${friendlyCurrentArticleName.replace(RegExp("^(.+)\\s+[(][^)]+[)]\\s*$"), "$1")}`;
    let meth;
    if (typeof wikPos === "string" && wikPos.toLowerCase() === "first") {
      meth = "unshift";
    } else {
      meth = "push";
    }
    ret[meth](retargetDab(wikTarget, oldTarget, friendlyCurrentArticleName, titleToEdit));
  }
  ret.push(changeLinkTargetLink({
    newTarget: null,
    text: popupString("remove this link").split(" ").join("&nbsp;"),
    hint: popupString("remove all links to this disambig page from this article"),
    clickButton: getValueOf("popupDabsAutoClick"),
    oldTarget,
    summary: simplePrintf(getValueOf("popupRmDabLinkSummary"), [friendlyCurrentArticleName]),
    watch: getValueOf("popupWatchDisambiggedPages"),
    title: titleToEdit
  }));
  return ret;
};
const rmDupesFromSortedList = (list) => {
  const ret = [];
  for (const item of list) {
    if (ret.length === 0 || item !== ret[ret.length - 1]) {
      ret.push(item);
    }
  }
  return ret;
};
const makeFixDab = (data, navpop) => {
  const titleToEdit = navpop.parentPopup ? String(navpop.parentPopup.article) : void 0;
  const list = listLinks(data, navpop.originalArticle, titleToEdit);
  if (list.length === 0) {
    log("listLinks returned empty list");
    return null;
  }
  let html = `<hr />${popupString("Click to disambiguate this link to:")}<br>`;
  html += list.join(popupString("separator"));
  return html;
};
const makeFixDabs = (wikiText, navpop) => {
  if (getValueOf("popupFixDabs") && navpop.article && isDisambig(wikiText, navpop.article) && Title.fromURL(location.href).namespaceId() !== nsState.specialId && navpop.article.talkPage()) {
    setPopupHTML(makeFixDab(wikiText, navpop), "popupFixDab", navpop.idNumber);
  }
};
const popupRedlinkHTML = (article) => assume$2(changeLinkTargetLink({
  newTarget: null,
  text: popupString("remove this link").split(" ").join("&nbsp;"),
  hint: popupString("remove all links to this page from this article"),
  clickButton: getValueOf("popupRedlinkAutoClick"),
  oldTarget: String(article),
  summary: simplePrintf(getValueOf("popupRedlinkSummary"), [String(article)])
}));

const pendingNavpopTask = (navpop) => {
  if (navpop.pending === null) {
    navpop.pending = 0;
  }
  ++navpop.pending;
  debugData(navpop);
};
const completedNavpopTask = (navpop) => {
  if (navpop.pending) {
    --navpop.pending;
  }
  debugData(navpop);
};
const debugData = (navpopup) => {
  if (getValueOf("popupDebugging") && navpopup.idNumber) {
    setPopupHTML(`idNumber=${navpopup.idNumber}, pending=${String(navpopup.pending)}`, "popupError", navpopup.idNumber);
  }
};
const startArticlePreview = (article, oldid, navpop) => {
  navpop.redir = 0;
  loadPreview(article, oldid, navpop);
};
const loadPreview = (article, oldid, navpop) => {
  if (!navpop.redir) {
    navpop.originalArticle = article;
  }
  article.oldid = oldid;
  loadAPIPreview("revision", article, navpop);
};
const loadPreviewFromRedir = (redirMatch, navpop) => {
  const target = new Title().fromWikiText(redirMatch[2]);
  if (navpop.article?.anchor) {
    target.anchor = navpop.article.anchor;
  }
  ++navpop.redir;
  navpop.redirTarget = target;
  const warnRedir = navpop.article ? redirLink(target, navpop.article) : "";
  setPopupHTML(warnRedir, "popupWarnRedir", navpop.idNumber);
  navpop.article = target;
  fillEmptySpans({
    redir: true,
    redirTarget: target,
    navpopup: navpop
  });
  loadPreview(target, null, navpop);
};
const insertPreview = (download) => {
  if (!download.owner) {
    return;
  }
  const navpop = download.owner;
  const redirMatch = assume$2(nsState.re.redirect).exec(download.data ?? "");
  if (navpop.redir === 0 && redirMatch) {
    loadPreviewFromRedir(redirMatch, navpop);
    return;
  }
  if (navpop.visible || !getValueOf("popupLazyPreviews")) {
    insertPreviewNow(download);
  } else {
    const id = navpop.redir ? "PREVIEW_REDIR_HOOK" : "PREVIEW_HOOK";
    navpop.addHook(() => {
      insertPreviewNow(download);
      return true;
    }, "unhide", "after", id);
  }
};
const insertPreviewNow = (download) => {
  if (!download.owner) {
    return;
  }
  const wikiText = download.data ?? "";
  const navpop = download.owner;
  const art = navpop.redirTarget ?? navpop.originalArticle;
  if (!art) {
    return;
  }
  makeFixDabs(wikiText, navpop);
  if (getValueOf("popupSummaryData")) {
    getPageInfo(wikiText, download);
    setPopupTrailer(getPageInfo(wikiText, download), navpop.idNumber);
  }
  let imagePage;
  if (art.namespaceId() === nsState.imageId) {
    imagePage = art.toString();
  } else {
    imagePage = getValidImageFromWikiText(wikiText);
  }
  if (imagePage) {
    loadImage(Title.fromWikiText(imagePage), navpop);
  }
  if (getValueOf("popupPreviews")) {
    insertArticlePreview(download, art, navpop);
  }
};
const insertArticlePreview = (download, art, navpop) => {
  if (typeof download.data === "string") {
    if (art.namespaceId() === nsState.templateId && getValueOf("popupPreviewRawTemplates")) {
      const h = `<hr /><span style="font-family: monospace;">${entify(download.data).split("\\n").join("<br />\\n")}</span>`;
      setPopupHTML(h, "popupPreview", navpop.idNumber);
    } else {
      const p = prepPreviewmaker(download.data, art, navpop);
      p.showPreview();
    }
  }
};
const prepPreviewmaker = (data, article, navpop) => {
  const d = anchorize(data, article.anchorString());
  const urlBase = joinPath([siteState.articlebase, article.urlString()]);
  const p = new Previewmaker(d, urlBase, navpop);
  return p;
};
const anchorize = (d, anch) => {
  if (!anch) {
    return d;
  }
  const anchRe = RegExp(`(?:=+\\s*${literalizeRegex(anch).replace(/[_ ]/g, "[_ ]")}\\s*=+|\\{\\{\\s*${getValueOf("popupAnchorRegexp")}\\s*(?:\\|[^|}]*)*?\\s*${literalizeRegex(anch)}\\s*(?:\\|[^}]*)?}})`);
  const match = d.match(anchRe);
  if (match && match.length > 0 && match[0]) {
    return d.substring(d.indexOf(match[0]));
  }
  const lines = d.split("\n");
  for (let i = 0; i < lines.length; ++i) {
    lines[i] = lines[i].replace(RegExp("[[]{2}([^|\\]]*?[|])?(.*?)[\\]]{2}", "g"), "$2").replace(/'''([^'])/g, "$1").replace(RegExp("''([^'])", "g"), "$1");
    if (lines[i].match(anchRe)) {
      return d.split("\n").slice(i).join("\n").replace(RegExp("^[^=]*"), "");
    }
  }
  return d;
};

const loadAPIPreview = (queryType, article, navpop) => {
  const art = new Title(article).urlString();
  let url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query&`;
  let htmlGenerator = () => {
    alert("invalid html generator");
    return void 0;
  };
  let usernameart;
  switch (queryType) {
    case "history":
      url += `titles=${art}&prop=revisions&rvlimit=${getValueOf("popupHistoryPreviewLimit")}`;
      htmlGenerator = APIhistoryPreviewHTML;
      break;
    case "category":
      url += `list=categorymembers&cmtitle=${art}`;
      htmlGenerator = APIcategoryPreviewHTML;
      break;
    case "userinfo": {
      const username = new Title(article).userName();
      usernameart = encodeURIComponent(String(username));
      if (assume$2(wiki.re.ipUser).test(String(username))) {
        url += `list=blocks&bkprop=range|restrictions&bkip=${usernameart}`;
      } else {
        url += `list=users|usercontribs&usprop=blockinfo|groups|editcount|registration|gender&ususers=${usernameart}&uclimit=1&ucprop=timestamp&ucuser=${usernameart}`;
      }
      htmlGenerator = APIuserInfoPreviewHTML;
      break;
    }
    case "contribs":
      usernameart = encodeURIComponent(String(new Title(article).userName()));
      url += `list=usercontribs&ucuser=${usernameart}&uclimit=${getValueOf("popupContribsPreviewLimit")}`;
      htmlGenerator = APIcontribsPreviewHTML;
      break;
    case "imagepagepreview": {
      let trail = "";
      if (getValueOf("popupImageLinks")) {
        trail = `&list=imageusage&iutitle=${art}`;
      }
      url += `titles=${art}&prop=revisions|imageinfo&rvslots=main&rvprop=content${trail}`;
      htmlGenerator = APIimagepagePreviewHTML;
      break;
    }
    case "backlinks":
      url += `list=backlinks&bltitle=${art}`;
      htmlGenerator = APIbacklinksPreviewHTML;
      break;
    case "revision":
      if (article.oldid) {
        url += `revids=${article.oldid}`;
      } else {
        url += `titles=${article.removeAnchor().urlString()}`;
      }
      url += "&prop=revisions|pageprops|info|images|categories&rvslots=main&rvprop=ids|timestamp|flags|comment|user|content&cllimit=max&imlimit=max";
      htmlGenerator = APIrevisionPreviewHTML;
      break;
  }
  pendingNavpopTask(navpop);
  const callback = async (d) => {
    log("callback of API functions was hit");
    if (queryType === "userinfo") {
      await fetchUserGroupNames(d.data);
      showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
      return;
    }
    showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
  };
  const go = () => {
    getPageWithCaching(url, callback, navpop);
    return true;
  };
  if (navpop.visible || !getValueOf("popupLazyDownloads")) {
    go();
  } else {
    navpop.addHook(go, "unhide", "before", `DOWNLOAD_${queryType}_QUERY_DATA`);
  }
};
const linkList = (list) => {
  list.sort((x, y) => x === y ? 0 : x < y ? -1 : 1);
  const buf = [];
  for (const item of list) {
    buf.push(wikiLink({
      article: new Title(item),
      text: item.split(" ").join("&nbsp;"),
      action: "view"
    }));
  }
  return buf.join(popupString("separator"));
};
let userTimeZone = null;
const getTimeOffset = () => {
  const tz = mw.user.options.get("timecorrection");
  if (tz) {
    if (tz.includes("|")) {
      return parseInt(tz.split("|")[1], 10);
    }
  }
  return 0;
};
const getTimeZone = () => {
  if (!userTimeZone) {
    const tz = mw.user.options.get("timecorrection");
    userTimeZone = "UTC";
    if (tz) {
      const tzComponents = tz.split("|");
      if (tzComponents.length === 3 && tzComponents[0] === "ZoneInfo") {
        userTimeZone = tzComponents[2];
      } else {
        errlog(`Unexpected timezone information: ${tz}`);
      }
    }
  }
  return userTimeZone;
};
const useTimeOffset = () => {
  if (typeof Intl.DateTimeFormat.prototype.formatToParts === "undefined") {
    return true;
  }
  const tz = mw.user.options.get("timecorrection");
  if (tz?.includes("ZoneInfo|") === false) {
    return true;
  }
  return false;
};
let userLocales = null;
const getLocales = () => {
  if (!userLocales) {
    let userLanguage = document.querySelector("html")?.getAttribute("lang") ?? null;
    if (getValueOf("popupLocale")) {
      userLanguage = getValueOf("popupLocale");
    } else if (userLanguage === "en") {
      if (getMWDateFormat() === "mdy") {
        userLanguage = "en-US";
      } else {
        userLanguage = "en-GB";
      }
    }
    userLocales = Intl.DateTimeFormat.supportedLocalesOf([userLanguage ?? "", navigator.language]);
  }
  return userLocales;
};
const getMWDateFormat = () => mw.user.options.get("date");
const editPreviewTable = (article, h, reallyContribs) => {
  let html = ["<table>"];
  let day = null;
  let curart = article;
  let page = null;
  let makeFirstColumnLinks;
  if (reallyContribs) {
    makeFirstColumnLinks = (currentRevision) => {
      let result = "(";
      result += `<a href="${siteState.titlebase}${new Title(currentRevision.title ?? "").urlString()}&diff=prev&oldid=${String(currentRevision.revid)}">${popupString("diff")}</a>`;
      result += "&nbsp;|&nbsp;";
      result += `<a href="${siteState.titlebase}${new Title(currentRevision.title ?? "").urlString()}&action=history">${popupString("hist")}</a>`;
      result += ")";
      return result;
    };
  } else {
    const firstRevid = h[0].revid;
    makeFirstColumnLinks = (currentRevision) => {
      let result = "(";
      result += `<a href="${siteState.titlebase}${new Title(curart).urlString()}&diff=${String(firstRevid)}&oldid=${String(currentRevision.revid)}">${popupString("cur")}</a>`;
      result += "&nbsp;|&nbsp;";
      result += `<a href="${siteState.titlebase}${new Title(curart).urlString()}&diff=prev&oldid=${String(currentRevision.revid)}">${popupString("last")}</a>`;
      result += ")";
      return result;
    };
  }
  for (let i = 0; i < h.length; ++i) {
    if (reallyContribs) {
      page = h[i].title ?? null;
      curart = new Title(page);
    }
    const minor = h[i].minor ? "<b>\u5C0F </b>" : "";
    const editDate = new Date(h[i].timestamp ?? "");
    let thisDay = formattedDate(editDate);
    const thisTime = formattedTime(editDate);
    if (thisDay === day) {
      thisDay = "";
    } else {
      day = thisDay;
    }
    if (thisDay) {
      html.push(`<tr><td colspan=3><span class="popup_history_date">${thisDay}</span></td></tr>`);
    }
    html.push(`<tr class="popup_history_row_${i % 2 ? "odd" : "even"}">`);
    html.push(`<td>${makeFirstColumnLinks(h[i])}</td>`);
    html.push(`<td><a href="${siteState.titlebase}${new Title(curart).urlString()}&oldid=${String(h[i].revid)}">${thisTime}</a></td>`);
    let col3url, col3txt;
    if (!reallyContribs) {
      const user = h[i].user;
      if (!h[i].userhidden) {
        if (assume$2(wiki.re.ipUser).test(String(user))) {
          col3url = `${siteState.titlebase + mw.config.get("wgFormattedNamespaces")[nsState.specialId]}:Contributions&target=${new Title(user ?? /* istanbul ignore next -- ipUser 命中蕴含 user 是非空串（null/undefined 的 String() 都不匹配 IP 形状），?? 兜底结构性不可达；legacy :252 同款照搬 */
          "").urlString()}`;
        } else {
          col3url = `${siteState.titlebase + mw.config.get("wgFormattedNamespaces")[nsState.userId]}:${new Title(user ?? "").urlString()}`;
        }
        col3txt = escapeQuotesHTML(user ?? "");
      } else {
        col3url = getValueOf("popupRevDelUrl");
        col3txt = escapeQuotesHTML(popupString("revdel"));
      }
    } else {
      col3url = siteState.titlebase + curart.urlString();
      col3txt = escapeQuotesHTML(page ?? "");
    }
    html.push(`<td>${reallyContribs ? minor : ""}<a href="${col3url}">${col3txt}</a></td>`);
    let comment = "";
    const c = h[i].comment || (typeof h[i].slots !== "undefined" ? h[i].slots?.main?.content ?? null : null);
    if (c) {
      comment = new Previewmaker(c, new Title(curart).toUrl()).editSummaryPreview();
    } else if (h[i].commenthidden) {
      comment = popupString("revdel");
    }
    html.push(`<td>${!reallyContribs ? minor : ""}${comment}</td>`);
    html.push("</tr>");
    html = [html.join("")];
  }
  html.push("</table>");
  return html.join("");
};
const adjustDate = (d, offset) => {
  const o = offset * 60 * 1e3;
  return new Date(+d + o);
};
const convertTimeZone = (date, timeZone) => new Date(date.toLocaleString("en-US", {
  timeZone
}));
const formattedDateTime = (date) => {
  if (useTimeOffset()) {
    return `${formattedDate(date)} ${formattedTime(date)}`;
  }
  if (getMWDateFormat() === "ISO 8601") {
    const d2 = convertTimeZone(date, getTimeZone());
    return `${map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]).join("-")}T${map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]).join(":")}`;
  }
  const options = getValueOf("popupDateTimeFormatterOptions");
  options.timeZone = getTimeZone();
  return date.toLocaleString(getLocales(), options);
};
const formattedDate = (date) => {
  if (useTimeOffset()) {
    const d2 = adjustDate(date, getTimeOffset());
    return map(zeroFill, [d2.getUTCFullYear(), d2.getUTCMonth() + 1, d2.getUTCDate()]).join("-");
  }
  if (getMWDateFormat() === "ISO 8601") {
    const d2 = convertTimeZone(date, getTimeZone());
    return map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]).join("-");
  }
  const options = getValueOf("popupDateFormatterOptions");
  options.timeZone = getTimeZone();
  return date.toLocaleDateString(getLocales(), options);
};
const formattedTime = (date) => {
  if (useTimeOffset()) {
    const d2 = adjustDate(date, getTimeOffset());
    return map(zeroFill, [d2.getUTCHours(), d2.getUTCMinutes(), d2.getUTCSeconds()]).join(":");
  }
  if (getMWDateFormat() === "ISO 8601") {
    const d2 = convertTimeZone(date, getTimeZone());
    return map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]).join(":");
  }
  const options = getValueOf("popupTimeFormatterOptions");
  options.timeZone = getTimeZone();
  return date.toLocaleTimeString(getLocales(), options);
};
const fetchUserGroupNames = (userinfoResponse) => {
  const queryObj = getJsObj(userinfoResponse ?? "");
  const user = anyChild(queryObj.query?.users ?? {});
  const messages = [];
  if (user?.groups) {
    user.groups.forEach((groupName) => {
      messages.push(`group-${groupName}-member`);
    });
  }
  if (queryObj.query?.globaluserinfo?.groups) {
    queryObj.query.globaluserinfo.groups.forEach((groupName) => {
      messages.push(`group-${groupName}-member`);
    });
  }
  return getMwApi().loadMessagesIfMissing(messages);
};
const showAPIPreview = (queryType, html, id, navpop, download) => {
  let target = "popupPreview";
  completedNavpopTask(navpop);
  switch (queryType) {
    case "imagelinks":
    case "category":
      target = "popupPostPreview";
      break;
    case "userinfo":
      target = "popupUserData";
      break;
    case "revision":
      if (typeof html === "string" && html) {
        setPopupTipsAndHTML(html, target, id);
        return;
      }
      if (download) {
        insertPreview(download);
      }
      return;
  }
  setPopupTipsAndHTML(html, target, id);
};
const APIrevisionPreviewHTML = (_article, download) => {
  try {
    const jsObj = getJsObj(download.data ?? "");
    const q = jsObj.query;
    if (!q?.pages) {
      return "Revision preview failed :(";
    }
    const page = anyChild(q.pages);
    if (!page) {
      return "Revision preview failed :(";
    }
    if (page.missing) {
      download.owner = null;
      return;
    }
    const slot = page.revisions?.[0]?.slots?.main;
    const content = slot?.contentmodel === "wikitext" ? slot.content : null;
    if (typeof content === "string") {
      download.data = content;
      download.lastModified = new Date(assume$2(page.revisions)[0].timestamp ?? "");
    } else if (typeof slot?.content === "string") {
      const truncated = slot.content.split("\n").slice(0, +getValueOf("popupMaxPreviewSentences")).join("\n").slice(0, +getValueOf("popupMaxPreviewCharacters"));
      return `<pre>${entify(truncated)}</pre>`;
    }
    if (page.pageprops?.wikibase_item) {
      download.wikibaseItem = page.pageprops.wikibase_item;
      download.wikibaseRepo = `${q.wikibase?.repo?.url?.base ?? ""}${q.wikibase?.repo?.url?.articlepath ?? ""}`;
    }
    if (typeof content !== "string" && typeof slot?.content !== "string") {
      return popupString("revdel");
    }
  } catch {
    return "Revision preview failed :(";
  }
  return void 0;
};
const APIbacklinksPreviewHTML = (_article, download) => {
  try {
    const jsObj = getJsObj(download.data ?? "");
    const q = jsObj.query;
    if (!q) {
      return "backlinksPreviewHTML went wonky";
    }
    const list = q.backlinks;
    let html = [];
    if (!list) {
      return popupString("No backlinks found");
    }
    for (const entry of list) {
      const t = new Title(entry.title);
      html.push(`<a href="${siteState.titlebase}${t.urlString()}">${entify(t.toString())}</a>`);
    }
    html = html.join(popupString("separator"));
    if (jsObj.continue?.blcontinue) {
      html += popupString(" and more");
    }
    return html;
  } catch {
    return "backlinksPreviewHTML went wonky";
  }
};
const APIsharedImagePagePreviewHTML = (obj) => {
  log("APIsharedImagePagePreviewHTML");
  const popupid = obj.requestid;
  if (obj.query?.pages) {
    const page = anyChild(obj.query.pages);
    const content = page?.revisions?.[0]?.slots?.main?.contentmodel === "wikitext" ? page.revisions[0].slots.main.content : null;
    if (typeof content === "string" && eventsState.current.link?.navpopup) {
      const navpop = eventsState.current.link.navpopup;
      const p = new Previewmaker(content, assume$2(navpop.article), navpop);
      p.makePreview();
      setPopupHTML(p.html, "popupSecondPreview", popupid);
    }
  }
};
const APIimagepagePreviewHTML = (article, download, navpop) => {
  try {
    const jsObj = getJsObj(download.data ?? "");
    const q = jsObj.query;
    if (!q?.pages) {
      return "API imagepage preview failed :(";
    }
    const page = anyChild(q.pages);
    const content = page?.revisions?.[0]?.slots?.main?.contentmodel === "wikitext" ? page.revisions[0].slots.main.content : null;
    let ret = "";
    let alt = "";
    try {
      alt = navpop.parentAnchor?.childNodes[0]?.alt;
    } catch {
    }
    if (alt) {
      ret = `${ret}<hr /><b>${popupString("Alt text:")}</b> ${escapeQuotesHTML(alt)}`;
    }
    if (typeof content === "string") {
      const p = prepPreviewmaker(content, article, navpop);
      p.makePreview();
      if (p.html) {
        ret += `<hr />${p.html}`;
      }
      if (getValueOf("popupSummaryData")) {
        const info = getPageInfo(content, download);
        log(info);
        setPopupTrailer(info, navpop.idNumber);
      }
    }
    if (page?.imagerepository === "shared") {
      const art = new Title(article);
      const encart = encodeURIComponent(`File:${art.stripNamespace()}`);
      const shared_url = `${siteState.apicommonsbase}?format=json&formatversion=2&callback=pg.fn.APIsharedImagePagePreviewHTML&requestid=${String(navpop.idNumber)}&action=query&prop=revisions&rvslots=main&rvprop=content&titles=${encart}`;
      ret = `${ret}<hr />${popupString("Image from Commons")}: <a href="${siteState.commonsbase}?title=${encart}">${popupString("Description page")}</a>`;
      mw.loader.load(shared_url);
    }
    showAPIPreview("imagelinks", APIimagelinksPreviewHTML(article, download), navpop.idNumber, download);
    return ret;
  } catch {
    return "API imagepage preview failed :(";
  }
};
const APIimagelinksPreviewHTML = (_article, download) => {
  try {
    const jsobj = getJsObj(download.data ?? "");
    const list = jsobj.query?.imageusage;
    if (list) {
      const ret = [];
      for (const entry of list) {
        ret.push(entry.title);
      }
      if (ret.length === 0) {
        return popupString("No image links found");
      }
      return `<h2>${popupString("File links")}</h2>${linkList(ret)}`;
    }
    return popupString("No image links found");
  } catch {
    return "Image links preview generation failed :(";
  }
};
const APIcategoryPreviewHTML = (_article, download) => {
  try {
    const jsobj = getJsObj(download.data ?? "");
    const list = jsobj.query?.categorymembers;
    let ret = [];
    if (!list) {
      return popupString("Empty category");
    }
    for (const entry of list) {
      ret.push(entry.title);
    }
    if (ret.length === 0) {
      return popupString("Empty category");
    }
    ret = `<h2>${tprintf("Category members (%s shown)", [ret.length])}</h2>${linkList(ret)}`;
    if (jsobj.continue?.cmcontinue) {
      ret += popupString(" and more");
    }
    return ret;
  } catch {
    return "Category preview failed :(";
  }
};
const APIuserInfoPreviewHTML = (_article, download) => {
  let ret = [];
  let queryobj;
  try {
    queryobj = getJsObj(download.data ?? "");
  } catch {
    return "Userinfo preview failed :(";
  }
  const user = anyChild(queryobj.query?.users ?? {});
  if (user) {
    const globaluserinfo = queryobj.query?.globaluserinfo;
    if (user.invalid === "") {
      ret.push(popupString("Invalid user"));
    } else if (user.missing === "") {
      ret.push(popupString("Not a registered username"));
    }
    if (user.blockedby) {
      if (user.blockpartial) {
        ret.push(`<b>${popupString("Has blocks")}</b>`);
      } else {
        ret.push(`<b>${popupString("BLOCKED")}</b>`);
      }
    }
    if (globaluserinfo && (Reflect.has(globaluserinfo, "locked") || Reflect.has(globaluserinfo, "hidden"))) {
      let lockedSulAccountIsAttachedToThis = true;
      for (let i = 0; globaluserinfo.unattached && i < globaluserinfo.unattached.length; i++) {
        if (globaluserinfo.unattached[i].wiki === mw.config.get("wgDBname")) {
          lockedSulAccountIsAttachedToThis = false;
          break;
        }
      }
      if (lockedSulAccountIsAttachedToThis) {
        if (Reflect.has(globaluserinfo, "locked")) {
          ret.push(`<b><i>${popupString("LOCKED")}</i></b>`);
        }
        if (Reflect.has(globaluserinfo, "hidden")) {
          ret.push(`<b><i>${popupString("HIDDEN")}</i></b>`);
        }
      }
    }
    if (getValueOf("popupShowGender") && user.gender) {
      switch (user.gender) {
        case "male":
          ret.push(popupString("\u2642"));
          break;
        case "female":
          ret.push(popupString("\u2640"));
          break;
      }
    }
    if (user.groups) {
      const ug = [];
      user.groups.forEach((groupName) => {
        if (!["*", "user", "autoconfirmed"].includes(groupName)) {
          ug.push(escapeQuotesHTML(mw.message(`group-${groupName}-member`, user.gender ?? "").text()));
        }
      });
      if (!user.groups.includes("autoconfirmed")) {
        ug.push(`<b>${escapeQuotesHTML(popupString("group-no-autoconfirmed"))}</b>`);
      }
      if (ug.length === 0) {
        ug.push(escapeQuotesHTML(mw.message("group-user-member", user.gender ?? "").text()));
      }
      ret.push(ug.join(popupString("separator")));
    }
    if (globaluserinfo?.groups) {
      const gug = [];
      globaluserinfo.groups.forEach((groupName) => {
        gug.push(`<i>${escapeQuotesHTML(mw.message(`group-${groupName}-member`, user.gender ?? "").text())}</i>`);
      });
      ret.push(gug.join(popupString("separator")));
    }
    if (user.registration) {
      ret.push(escapeQuotesHTML(`${user.editcount ? user.editcount : "0"}${popupString(" edits since: ")}${user.registration ? formattedDate(new Date(user.registration)) : (
        /* istanbul ignore next -- 外层 if (user.registration) 已确证真值，同一对象两次读取之间无副作用，else 侧死分支；legacy :587 同款照搬 */
        ""
      )}`));
    }
  }
  if (queryobj.query?.usercontribs?.length) {
    ret.push(popupString("last edit on ") + formattedDate(new Date(queryobj.query.usercontribs[0].timestamp ?? "")));
  }
  if (queryobj.query?.blocks) {
    ret.push(popupString("IP user"));
    for (const block of queryobj.query.blocks) {
      let rbstr = block.rangestart === block.rangeend ? "BLOCK" : "RANGEBLOCK";
      rbstr = !Array.isArray(block.restrictions) ? `Has ${rbstr.toLowerCase()}s` : `${rbstr}ED`;
      ret.push(`<b>${popupString(rbstr)}</b>`);
    }
  }
  ret = `<hr />${ret.join(popupString("comma"))}`;
  return ret;
};
const APIcontribsPreviewHTML = (article, download, navpop) => APIhistoryPreviewHTML(article, download, navpop, true);
const APIhistoryPreviewHTML = (article, download, _navpop, reallyContribs) => {
  try {
    const jsobj = getJsObj(download.data ?? "");
    let edits = [];
    if (reallyContribs) {
      edits = jsobj.query?.usercontribs ?? [];
    } else {
      edits = anyChild(jsobj.query?.pages ?? {})?.revisions ?? [];
    }
    const ret = editPreviewTable(article, edits, reallyContribs);
    return ret;
  } catch {
    return popupString("History preview failed");
  }
};

const textOf = (x) => typeof x === "string" ? x : x.text ?? "";
const entryOf = (x) => typeof x === "string" ? { text: x } : x;
const delFmt = (x) => {
  if (!x.length) {
    return "";
  }
  return `<del class='popupDiff'>${x.map(textOf).join("")}</del>`;
};
const insFmt = (x) => {
  if (!x.length) {
    return "";
  }
  return `<ins class='popupDiff'>${x.map(textOf).join("")}</ins>`;
};
const countCrossings = (a, b, i, eject) => {
  const bEntry = entryOf(b[i]);
  if (!bEntry.row && bEntry.row !== 0) {
    return -1;
  }
  let count = 0;
  for (let j = 0; j < a.length; ++j) {
    const aEntry = entryOf(a[j]);
    if (!aEntry.row && aEntry.row !== 0) {
      continue;
    }
    if ((j - (bEntry.row ?? Number.NaN)) * (i - (aEntry.row ?? Number.NaN)) > 0) {
      {
        return true;
      }
    }
  }
  return count;
};
const shortenDiffString = (str, context) => {
  const re = /(<del[\s\S]*?<\/del>|<ins[\s\S]*?<\/ins>)/;
  const splitted = parenSplit(str, re);
  let ret = [""];
  for (let i = 0; i < splitted.length; i += 2) {
    if (splitted[i].length < 2 * context) {
      ret[ret.length - 1] += splitted[i];
      if (i + 1 < splitted.length) {
        ret[ret.length - 1] += splitted[i + 1];
      }
      continue;
    } else {
      if (i > 0) {
        ret[ret.length - 1] += splitted[i].substring(0, context);
      }
      if (i + 1 < splitted.length) {
        ret.push(splitted[i].substring(splitted[i].length - context) + splitted[i + 1]);
      }
    }
  }
  while (ret.length > 0 && !ret[0]) {
    ret = ret.slice(1);
  }
  return ret;
};
const diffString = (o, n, simpleSplit) => {
  const splitRe = /([[]{2}|[\]]{2}|[{]{2,3}|[}]{2,3}|[|]|=|<|>|[*:]+|\s|\b)/;
  let i, oSplitted, nSplitted;
  {
    oSplitted = parenSplit(o, splitRe);
    nSplitted = parenSplit(n, splitRe);
  }
  for (i = 0; i < oSplitted.length; ++i) {
    oSplitted[i] = entify(oSplitted[i]);
  }
  for (i = 0; i < nSplitted.length; ++i) {
    nSplitted[i] = entify(nSplitted[i]);
  }
  const out = diff(oSplitted, nSplitted);
  let str = "";
  let acc = [];
  let maxOutputPair = 0;
  for (i = 0; i < out.n.length; ++i) {
    const nEntry = entryOf(out.n[i]);
    if (nEntry.paired && typeof nEntry.row === "number") {
      if (maxOutputPair > nEntry.row) {
        out.o[nEntry.row] = textOf(out.o[nEntry.row]);
        out.n[i] = textOf(out.n[i]);
      }
      if (maxOutputPair < nEntry.row) {
        maxOutputPair = nEntry.row;
      }
    }
  }
  for (i = 0; i < out.o.length && !entryOf(out.o[i]).paired; ++i) {
    acc.push(out.o[i]);
  }
  str += delFmt(acc);
  acc = [];
  for (i = 0; i < out.n.length; ++i) {
    while (i < out.n.length && !entryOf(out.n[i]).paired) {
      acc.push(out.n[i++]);
    }
    str += insFmt(acc);
    acc = [];
    if (i < out.n.length) {
      str += textOf(out.n[i]);
      let m = (entryOf(out.n[i]).row ?? -1) + 1;
      while (m < out.o.length && !entryOf(out.o[m]).paired) {
        acc.push(out.o[m++]);
      }
      str += delFmt(acc);
      acc = [];
    }
  }
  return str;
};
const jsReservedProperties = RegExp("^(constructor|prototype|__((define|lookup)[GS]etter)__|eval|hasOwnProperty|propertyIsEnumerable|to(Source|String|LocaleString)|(un)?watch|valueOf)$");
const diffBugAlert = (word) => {
  if (!diffBugAlert.list[word]) {
    diffBugAlert.list[word] = 1;
    alert(`Bad word: ${word}

Please report this bug.`);
  }
};
diffBugAlert.list = {};
const makeDiffHashtable = (src) => {
  const ret = {};
  for (let i = 0; i < src.length; i++) {
    const key = textOf(src[i]);
    if (jsReservedProperties.test(key)) {
      src[i] = `${key}<!-- -->`;
    }
    if (!ret[key]) {
      ret[key] = [];
    }
    try {
      ret[key].push(i);
    } catch {
      diffBugAlert(key);
    }
  }
  return ret;
};
const diff = (o, n) => {
  const ns = makeDiffHashtable(n);
  const os = makeDiffHashtable(o);
  let i;
  for (i in ns) {
    const osi = os[i];
    if (ns[i].length === 1 && osi?.length === 1) {
      n[ns[i][0]] = {
        text: textOf(n[ns[i][0]]),
        row: os[i][0],
        paired: true
      };
      o[os[i][0]] = {
        text: textOf(o[os[i][0]]),
        row: ns[i][0],
        paired: true
      };
    }
  }
  for (i = 0; i < n.length - 1; i++) {
    const entry = entryOf(n[i]);
    const row = entry.row ?? -1;
    if (entry.paired && !entryOf(n[i + 1]).paired && row + 1 < o.length && !entryOf(o[row + 1]).paired && textOf(n[i + 1]) === textOf(o[row + 1])) {
      n[i + 1] = {
        text: textOf(n[i + 1]),
        row: row + 1,
        paired: true
      };
      o[row + 1] = {
        text: textOf(o[row + 1]),
        row: i + 1,
        paired: true
      };
    }
  }
  for (i = n.length - 1; i > 0; i--) {
    const entry = entryOf(n[i]);
    const row = entry.row ?? -1;
    if (entry.paired && !entryOf(n[i - 1]).paired && row > 0 && !entryOf(o[row - 1]).paired && textOf(n[i - 1]) === textOf(o[row - 1])) {
      n[i - 1] = {
        text: textOf(n[i - 1]),
        row: row - 1,
        paired: true
      };
      o[row - 1] = {
        text: textOf(o[row - 1]),
        row: i - 1,
        paired: true
      };
    }
  }
  return {
    o,
    n
  };
};

const loadDiff = (article, oldid, diff2, navpop) => {
  navpop.diffData = {
    oldRev: {},
    newRev: {}
  };
  const api = getMwApi();
  const params = {
    action: "compare",
    prop: "ids|title"
  };
  params.fromtitle = article.toString();
  switch (diff2) {
    case "cur":
      switch (oldid) {
        case null:
        case "":
        case "prev":
          params.torelative = "prev";
          break;
        default:
          params.fromrev = oldid;
          params.torelative = "cur";
          break;
      }
      break;
    case "prev":
      if (oldid && oldid !== "cur") {
        params.fromrev = oldid;
      }
      params.torelative = "prev";
      break;
    case "next":
      params.fromrev = oldid ?? 0;
      params.torelative = "next";
      break;
    default:
      params.fromrev = oldid ?? 0;
      params.torev = diff2;
      break;
  }
  void (async () => {
    const data = await api.get(params);
    const diffData = assume$2(navpop.diffData);
    diffData.oldRev.revid = data.compare.fromrevid;
    diffData.newRev.revid = data.compare.torevid;
    void addReviewLink(navpop, "popupMiscTools");
    const go = () => {
      pendingNavpopTask(navpop);
      let url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query&`;
      url += `revids=${String(navpop.diffData?.oldRev.revid)}|${String(navpop.diffData?.newRev.revid)}`;
      url += "&prop=revisions&rvslots=main&rvprop=ids|timestamp|content";
      getPageWithCaching(url, doneDiff, navpop);
      return true;
    };
    if (navpop.visible || !getValueOf("popupLazyDownloads")) {
      go();
    } else {
      navpop.addHook(go, "unhide", "before", "DOWNLOAD_DIFFS");
    }
  })();
};
const addReviewLink = async (navpop, target) => {
  if (!userState.canReview) {
    return;
  }
  const diffData = navpop.diffData;
  if (!diffData) {
    return;
  }
  if (+(diffData.newRev.revid ?? NaN) <= +(diffData.oldRev.revid ?? NaN)) {
    return;
  }
  const params = {
    action: "query",
    prop: "info|flagged",
    revids: diffData.oldRev.revid,
    formatversion: 2
  };
  const data = await getMwApi().get(params);
  const stable_revid = data.query.pages[0].flagged?.stable_revid ?? 0;
  if (stable_revid === diffData.oldRev.revid) {
    const a = document.createElement("a");
    a.innerHTML = popupString("mark patrolled");
    a.title = popupString("markpatrolledHint");
    a.onclick = async () => {
      const params2 = {
        action: "review",
        revid: diffData.newRev.revid,
        comment: tprintf("defaultpopupReviewedSummary", [diffData.oldRev.revid, diffData.newRev.revid])
      };
      try {
        await getMwApi().postWithToken("csrf", params2);
        a.style.display = "none";
      } catch {
        alert(popupString("Could not marked this edit as patrolled"));
      }
    };
    setPopupHTML(a, target, navpop.idNumber, null, true);
  }
};
const doneDiff = (download) => {
  const navpop = download.owner;
  const diffData = navpop?.diffData;
  if (!navpop || !diffData) {
    return;
  }
  completedNavpopTask(navpop);
  let pages;
  let revisions = [];
  try {
    pages = getJsObj(download.data ?? "").query?.pages;
    if (pages) {
      for (const page of pages) {
        revisions = revisions.concat(page.revisions ?? []);
      }
    }
    for (const revision of revisions) {
      if (revision.revid === diffData.oldRev.revid) {
        diffData.oldRev.revision = revision;
      } else if (revision.revid === diffData.newRev.revid) {
        diffData.newRev.revision = revision;
      }
    }
  } catch {
    errlog("Could not get diff");
  }
  insertDiff(navpop);
};
const rmBoringLines = (a, b, _context) => {
  let context = _context;
  if (typeof context === "undefined") {
    context = 2;
  }
  const aa = [], aaa = [];
  const bb = [], bbb = [];
  let i, j;
  for (i = 0; i < a.length; ++i) {
    const entry = entryOf(a[i]);
    if (!entry.paired) {
      aa[i] = 1;
    } else if (countCrossings(b, a, i)) {
      aa[i] = 1;
      bb[entry.row ?? -1] = 1;
    }
  }
  for (i = 0; i < b.length; ++i) {
    if (bb[i] === 1) {
      continue;
    }
    const entry = entryOf(b[i]);
    if (!entry.paired) {
      bb[i] = 1;
    }
  }
  for (i = 0; i < b.length; ++i) {
    if (bb[i] === 1) {
      for (j = Math.max(0, i - context); j < Math.min(b.length, i + context); ++j) {
        if (!bb[j]) {
          bb[j] = 1;
          aa[entryOf(b[j]).row ?? -1] = 0.5;
        }
      }
    }
  }
  for (i = 0; i < a.length; ++i) {
    if (aa[i] === 1) {
      for (j = Math.max(0, i - context); j < Math.min(a.length, i + context); ++j) {
        if (!aa[j]) {
          aa[j] = 1;
          bb[entryOf(a[j]).row ?? -1] = 0.5;
        }
      }
    }
  }
  for (i = 0; i < bb.length; ++i) {
    if ((bb[i] ?? 0) > 0) {
      const entry = entryOf(b[i]);
      if (entry.paired) {
        bbb.push(entry.text ?? "");
      } else {
        bbb.push(b[i]);
      }
    }
  }
  for (i = 0; i < aa.length; ++i) {
    if ((aa[i] ?? 0) > 0) {
      const entry = entryOf(a[i]);
      if (entry.paired) {
        aaa.push(entry.text ?? "");
      } else {
        aaa.push(a[i]);
      }
    }
  }
  return {
    a: aaa,
    b: bbb
  };
};
const stripOuterCommonLines = (a, b, context) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    ++i;
  }
  let j = a.length - 1;
  let k = b.length - 1;
  while (j >= 0 && k >= 0 && a[j] === b[k]) {
    --j;
    --k;
  }
  return {
    a: a.slice(Math.max(0, i - 1 - context), Math.min(a.length + 1, j + context + 1)),
    b: b.slice(Math.max(0, i - 1 - context), Math.min(b.length + 1, k + context + 1))
  };
};
const insertDiff = (navpop) => {
  const oldContent = navpop.diffData?.oldRev.revision?.slots?.main?.content;
  const newContent = navpop.diffData?.newRev.revision?.slots?.main?.content;
  if (oldContent === void 0 || newContent === void 0) {
    return;
  }
  let oldlines = oldContent.split("\n");
  let newlines = newContent.split("\n");
  let inner = stripOuterCommonLines(oldlines, newlines, +getValueOf("popupDiffContextLines"));
  oldlines = inner.a;
  newlines = inner.b;
  let truncated = false;
  getValueOf("popupDiffMaxLines");
  const maxLines = +getValueOf("popupDiffMaxLines");
  if (oldlines.length > maxLines || newlines.length > maxLines) {
    truncated = true;
    inner = stripOuterCommonLines(oldlines.slice(0, maxLines), newlines.slice(0, maxLines), +getValueOf("popupDiffContextLines"));
    oldlines = inner.a;
    newlines = inner.b;
  }
  const lineDiff = diff(oldlines, newlines);
  const lines2 = rmBoringLines(lineDiff.o, lineDiff.n);
  const oldlines2 = lines2.a;
  const newlines2 = lines2.b;
  let html = "<hr />";
  if (getValueOf("popupDiffDates")) {
    html += diffDatesTable(navpop);
    html += "<hr />";
  }
  html += shortenDiffString(diffString(oldlines2.join("\n"), newlines2.join("\n")), +getValueOf("popupDiffContextCharacters")).join("<hr />");
  setPopupTipsAndHTML(html.split("\n").join("<br>") + (truncated ? `<hr /><b>${popupString("Diff truncated for performance reasons")}</b>` : ""), "popupPreview", navpop.idNumber);
};
const diffDatesTable = (navpop) => {
  const newRevision = navpop.diffData?.newRev.revision;
  const oldRevision = navpop.diffData?.oldRev.revision;
  let html = '<table class="popup_diff_dates">';
  if (newRevision && oldRevision) {
    html += diffDatesTableRow(newRevision, tprintf("New revision"));
    html += diffDatesTableRow(oldRevision, tprintf("Old revision"));
  }
  html += "</table>";
  return html;
};
const diffDatesTableRow = (revision, label) => {
  const lastModifiedDate = new Date(revision.timestamp ?? "");
  const txt = formattedDateTime(lastModifiedDate);
  const revlink = generalLink({
    url: `${mw.config.get("wgScript")}?oldid=${String(revision.revid)}`,
    text: label,
    title: label
  });
  return simplePrintf("<tr><td>%s</td><td>%s</td></tr>", [revlink, txt]);
};
const titledDiffLink = (l) => titledWikiLink({
  article: l.article,
  action: `${String(l.to)}&oldid=${String(l.from)}`,
  newWin: l.newWin,
  noPopup: l.noPopup,
  text: l.text,
  title: l.title,
  actionName: "diff"
});

const footnoteTarget = (a) => {
  const aTitle = Title.fromAnchor(a);
  const anch = aTitle.anchor;
  if (!/^(cite_note-|_note-|endnote)/.test(anch)) {
    return false;
  }
  const lTitle = Title.fromURL(location.href);
  if (lTitle.toString(true) !== aTitle.toString(true)) {
    return false;
  }
  let el = document.getElementById(anch);
  while (el && typeof el.nodeName === "string") {
    const nt = el.nodeName.toLowerCase();
    if (nt === "li") {
      return el;
    } else if (nt === "body") {
      return false;
    } else if (el.parentNode) {
      el = el.parentNode;
    } else {
      return false;
    }
  }
  return false;
};
const footnotePreview = (x, navpop) => {
  setPopupHTML(`<hr />${x.innerHTML}`, "popupPreview", navpop.idNumber);
};
const nonsimplePopupContent$1 = (a, article) => {
  const navpop = a.navpopup;
  if (!navpop) {
    return;
  }
  let diff = null;
  let history = null;
  const params = parseParams(a.href);
  const oldid = typeof params.oldid === "undefined" ? null : params.oldid;
  if (shouldShow(a, "popupPreviewDiffs")) {
    diff = params.diff;
  }
  if (shouldShow(a, "popupPreviewHistory")) {
    history = params.action === "history";
  }
  navpop.pending = 0;
  const referenceElement = footnoteTarget(a);
  if (referenceElement) {
    footnotePreview(referenceElement, navpop);
  } else if (diff) {
    loadDiff(article, oldid, diff, navpop);
  } else if (history) {
    loadAPIPreview("history", article, navpop);
  } else if (shouldShowNonSimple(a) && assume$2(wiki.re.contribs).test(a.href)) {
    loadAPIPreview("contribs", article, navpop);
  } else if (shouldShowNonSimple(a) && assume$2(wiki.re.backlinks).test(a.href)) {
    loadAPIPreview("backlinks", article, navpop);
  } else if (article.namespaceId() === nsState.imageId && (shouldShow(a, "imagePopupsForImages") || !anchorContainsImage(a))) {
    loadAPIPreview("imagepagepreview", article, navpop);
    loadImage(article, navpop);
  } else {
    if (article.namespaceId() === nsState.categoryId && shouldShow(a, "popupCategoryMembers")) {
      loadAPIPreview("category", article, navpop);
    } else if ((article.namespaceId() === nsState.userId || article.namespaceId() === nsState.usertalkId) && shouldShow(a, "popupUserInfo")) {
      loadAPIPreview("userinfo", article, navpop);
    }
    if (shouldShowNonSimple(a)) {
      startArticlePreview(article, oldid, navpop);
    }
  }
};

const eventsState = {
  current: { link: null, article: null, links: [], linksHash: {} },
  idNumber: 0,
  checkPopupPositionTimer: null
};
let abortAllFn = null;
const registerAbortAll = (fn) => {
  abortAllFn = fn;
};
const setupTooltips = (root, remove = false, force = false, popData = null) => {
  let container = root;
  log(`setupTooltips, container=${String(container)}, remove=${String(remove)}`);
  wireHtmloutSeams();
  if (!container) {
    if (getValueOf("popupOnEditSelection") && document.editform?.wpTextbox1) {
      document.editform.wpTextbox1.onmouseup = doSelectionPopup;
    }
    container = defaultPopupsContainer();
  }
  if (!remove && !force && container.ranSetupTooltipsAlready) {
    return;
  }
  container.ranSetupTooltipsAlready = !remove;
  const anchors = container.getElementsByTagName("A");
  setupTooltipsLoop(anchors, 0, 250, 100, remove, popData);
};
const defaultPopupsContainer = () => {
  if (getValueOf("popupOnlyArticleLinks")) {
    const moeskinArticle = document.getElementsByTagName("article")[0];
    return document.querySelector(".skin-vector-2022 .vector-body") ?? document.getElementById("mw_content") ?? document.getElementById("content") ?? document.getElementById("article") ?? moeskinArticle ?? document;
  }
  return document;
};
const setupTooltipsLoop = (anchors, begin, howmany, sleep, remove, popData) => {
  const finish = begin + howmany;
  const loopend = Math.min(finish, anchors.length);
  let j = loopend - begin;
  log(`setupTooltips: anchors.length=${anchors.length}, begin=${begin}, howmany=${howmany}, loopend=${loopend}, remove=${String(remove)}`);
  const doTooltip = remove ? removeTooltip : addTooltip;
  if (j > 0) {
    do {
      const a = anchors[loopend - j];
      if (!a.href) {
        log(`got null anchor at index ${loopend - j}`);
        continue;
      }
      doTooltip(a, popData);
    } while (--j);
  }
  if (finish < anchors.length) {
    setTimeout(() => {
      setupTooltipsLoop(anchors, finish, howmany, sleep, remove, popData);
    }, sleep);
  } else {
    if (!remove && !getValueOf("popupTocLinks")) {
      rmTocTooltips();
    }
  }
};
const rmTocTooltips = () => {
  const toc = document.getElementById("toc");
  if (toc) {
    const tocLinks = toc.getElementsByTagName("A");
    const tocLen = tocLinks.length;
    for (let j = 0; j < tocLen; ++j) {
      removeTooltip(tocLinks[j]);
    }
  }
};
const addTooltip = (a, popData) => {
  if (!isPopupLink(a)) {
    return;
  }
  a.onmouseover = mouseOverWikiLink;
  a.onmouseout = mouseOut;
  a.onmousedown = killPopup;
  a.hasPopup = true;
  a.popData = popData;
};
const removeTooltip = (a) => {
  if (!a.hasPopup) {
    return;
  }
  a.onmouseover = null;
  a.onmouseout = null;
  if (a.originalTitle) {
    a.title = a.originalTitle;
  }
  a.hasPopup = false;
};
const removeTitle = (a) => {
  if (!a.originalTitle) {
    a.originalTitle = a.title;
  }
  a.title = "";
};
const restoreTitle = (a) => {
  if (a.title || !a.originalTitle) {
    return;
  }
  a.title = a.originalTitle;
};
const removeModifierKeyHandler = (a) => {
  document.removeEventListener("keydown", a.modifierKeyHandler, false);
  document.removeEventListener("keyup", a.modifierKeyHandler, false);
};
function mouseOverWikiLink(_evt) {
  let evt = _evt;
  if (evt === void 0) {
    evt = window.event;
  }
  if (getValueOf("popupModifier")) {
    const action = getValueOf("popupModifierAction");
    const key = action === "disable" ? "keyup" : "keydown";
    const a = this;
    a.modifierKeyHandler = (e) => {
      mouseOverWikiLink2(a, e);
    };
    document.addEventListener(key, a.modifierKeyHandler, false);
  }
  mouseOverWikiLink2(this, evt);
}
const modifierPressed = (_evt) => {
  let evt = _evt;
  const mod = getValueOf("popupModifier");
  if (evt === void 0) {
    evt = window.event;
  }
  return !!(evt && mod && evt[`${String(mod).toLowerCase()}Key`]);
};
const isCorrectModifier = (_a, evt) => {
  if (!getValueOf("popupModifier")) {
    return true;
  }
  const action = getValueOf("popupModifierAction");
  return action === "enable" && modifierPressed(evt) || action === "disable" && !modifierPressed(evt);
};
const mouseOverWikiLink2 = (a, evt) => {
  if (!isCorrectModifier(a, evt)) {
    return;
  }
  if (getValueOf("removeTitles")) {
    removeTitle(a);
  }
  if (a === eventsState.current.link && a.navpopup?.isVisible()) {
    return;
  }
  eventsState.current.link = a;
  if (getValueOf("simplePopups") && !optionStore.popupStructure) {
    setDefault("popupStructure", "original");
  }
  const article = Title.fromAnchor(a);
  eventsState.current.article = article;
  if (!a.navpopup) {
    a.navpopup = newNavpopup(a, article);
    eventsState.current.linksHash[a.href] = a.navpopup;
    eventsState.current.links.push(a);
  }
  const navpop = a.navpopup;
  if (navpop.pending === null || navpop.pending !== 0) {
    simplePopupContent(a, article);
  }
  navpop.showSoonIfStable(navpop.delay);
  if (eventsState.checkPopupPositionTimer) {
    clearInterval(eventsState.checkPopupPositionTimer);
  }
  eventsState.checkPopupPositionTimer = setInterval(checkPopupPosition, 600);
  if (getValueOf("simplePopups")) {
    if (getValueOf("popupPreviewButton") && !a.simpleNoMore) {
      const d = document.createElement("div");
      d.className = "popupPreviewButtonDiv";
      const s = document.createElement("span");
      d.appendChild(s);
      s.className = "popupPreviewButton";
      s[`on${getValueOf("popupPreviewButtonEvent")}`] = () => {
        a.simpleNoMore = true;
        d.style.display = "none";
        nonsimplePopupContent(a, article);
      };
      s.innerHTML = popupString("show preview");
      setPopupHTML(d, "popupPreview", navpop.idNumber);
    }
  }
  if (navpop.pending !== 0) {
    nonsimplePopupContent(a, article);
  }
};
const simplePopupContent = (a, article) => {
  const navpop = a.navpopup;
  if (!navpop) {
    return;
  }
  navpop.hasPopupMenu = false;
  navpop.setInnerHTML(popupHTML(a));
  fillEmptySpans({ navpopup: navpop });
  setupDraggable(navpop);
  if (getValueOf("popupRedlinkRemoval") && a.className === "new") {
    setPopupHTML(`<br>${popupRedlinkHTML(article)}`, "popupRedlink", navpop.idNumber);
  }
};
const nonsimplePopupContent = (a, article) => {
  nonsimplePopupContent$1(a, article);
};
const registerHooks = (np) => {
  const popupMaxWidth = getValueOf("popupMaxWidth");
  if (typeof popupMaxWidth === "number") {
    const setMaxWidth = function() {
      this.mainDiv.style.maxWidth = `${popupMaxWidth}px`;
      this.maxWidth = popupMaxWidth;
    };
    np.addHook(setMaxWidth, "unhide", "before");
  }
  np.addHook(addPopupShortcuts, "unhide", "after");
  np.addHook(rmPopupShortcuts, "hide", "before");
};
const newNavpopup = (a, article) => {
  const navpopup = new Navpopup();
  navpopup.fuzz = 5;
  navpopup.delay = +getValueOf("popupDelay") * 1e3;
  navpopup.idNumber = ++eventsState.idNumber;
  setPopupIdNumber(navpopup.idNumber);
  navpopup.parentAnchor = a;
  navpopup.parentPopup = a.popData?.owner;
  navpopup.article = article;
  registerHooks(navpopup);
  return navpopup;
};
function killPopup() {
  removeModifierKeyHandler(this);
  if (getValueOf("popupShortcutKeys")) {
    rmPopupShortcuts();
  }
  const navpop = eventsState.current.link?.navpopup;
  if (navpop) {
    navpop.banish();
  }
  eventsState.current.link = null;
  if (abortAllFn) {
    abortAllFn();
  }
  if (eventsState.checkPopupPositionTimer) {
    clearInterval(eventsState.checkPopupPositionTimer);
    eventsState.checkPopupPositionTimer = null;
  }
  return true;
}
const fuzzyCursorOffMenus = (_x, _y, _fuzz, parent) => {
  const uls = parent.getElementsByTagName("ul");
  for (const ul of uls) {
    if (ul.className === "popup_menu" && ul.offsetWidth > 0) {
      return false;
    }
  }
  return true;
};
const checkPopupPosition = () => {
  const navpop = eventsState.current.link?.navpopup;
  if (navpop) {
    navpop.limitHorizontalPosition();
  }
};
function mouseOut() {
  const a = this;
  removeModifierKeyHandler(a);
  if (!a.navpopup) {
    return;
  }
  if (!a.navpopup.isVisible()) {
    a.navpopup.banish();
    return;
  }
  restoreTitle(a);
  Navpopup.tracker.addHook(posCheckerHook(a.navpopup));
}
const posCheckerHook = (navpop) => () => {
  if (!navpop.isVisible()) {
    return true;
  }
  if (Navpopup.tracker.dirty) {
    return false;
  }
  const x = Navpopup.tracker.x, y = Navpopup.tracker.y;
  const mouseOverNavpop = navpop.isWithin(x, y) || !fuzzyCursorOffMenus(x, y, navpop.fuzz, navpop.mainDiv);
  let t = getValueOf("popupHideDelay");
  if (t) {
    t = t * 1e3;
  }
  if (!t) {
    if (!mouseOverNavpop) {
      if (navpop.parentAnchor) {
        restoreTitle(navpop.parentAnchor);
      }
      navpop.banish();
      return true;
    }
    return false;
  }
  const d = +/* @__PURE__ */ new Date();
  if (!navpop.mouseLeavingTime) {
    navpop.mouseLeavingTime = d;
    return false;
  }
  if (mouseOverNavpop) {
    navpop.mouseLeavingTime = null;
    return false;
  }
  if (d - navpop.mouseLeavingTime > t) {
    navpop.mouseLeavingTime = null;
    navpop.banish();
    return true;
  }
  return false;
};
const runStopPopupTimer = (navpop) => {
  if (!navpop.stopPopupTimer) {
    navpop.stopPopupTimer = setInterval(posCheckerHook(navpop), 500);
    navpop.addHook(() => {
      clearInterval(navpop.stopPopupTimer);
    }, "hide", "before");
  }
};
let htmloutSeamsWired = false;
const wireHtmloutSeams = () => {
  if (htmloutSeamsWired) {
    return;
  }
  htmloutSeamsWired = true;
  registerPositionChecker(checkPopupPosition);
  registerTooltipScanner((root, popData) => {
    setupTooltips(root, false, true, popData ?? null);
  });
};

const defaultNavlinkSpec = () => {
  let str = "";
  str += "<b><<mainlink|shortcut= >></b>";
  if (getValueOf("popupLastEditLink")) {
    str += "*<<lastEdit|shortcut=/>>|<<lastContrib>>|<<sinceMe>>if(oldid){|<<oldEdit>>|<<diffCur>>}";
  }
  str += "if(user){<br><<contribs|shortcut=c>>*<<userlog|shortcut=L|log>>";
  str += "if(ipuser){*<<arin>>}if(wikimedia){*<<count|shortcut=#>>}";
  str += "if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>|<<blocklog|log>>}}";
  const editstr = "<<edit|shortcut=e>>";
  const editOldidStr = `if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{${editstr}}`;
  const historystr = "<<history|shortcut=h>>|<<editors|shortcut=E|>>";
  const watchstr = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
  str += `<br>if(talk){${editOldidStr}|<<new|shortcut=+>>*${historystr}*${watchstr}*<b><<article|shortcut=a>></b>|<<editArticle|edit>>}else{${editOldidStr}*${historystr}*${watchstr}*<b><<talk|shortcut=t>></b>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>}`;
  str += "<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>*<<move|shortcut=m>>";
  str += "if(admin){<br><<unprotect|unprotectShort>>|<<protect|shortcut=p>>|<<protectlog|log>>*<<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>>}";
  return str;
};
const navLinksHTML = (article, _hint, params) => {
  const str = `<span class="popupNavLinks">${defaultNavlinkSpec()}</span>`;
  return navlinkStringToHTML(str, article, params);
};
const expandConditionalNavlinkString = (s, article, z, _recursionCount) => {
  const oldid = z.oldid, rcid = z.rcid, diff = z.diff;
  let recursionCount = _recursionCount;
  if (typeof recursionCount !== "number") {
    recursionCount = 0;
  }
  const conditionalSplitRegex = RegExp("(;?\\s*if\\s*\\(\\s*([\\w]*)\\s*\\)\\s*\\{([^{}]*)\\}(\\s*else\\s*\\{([^{}]*?)\\}|))", "i");
  const splitted = parenSplit(s, conditionalSplitRegex);
  const numParens = 5;
  let ret = splitted[0];
  for (let i = 1; i < splitted.length; i = i + numParens + 1) {
    const testString = splitted[i + 2 - 1];
    const trueString = splitted[i + 3 - 1];
    const rawFalseString = splitted[i + 5 - 1];
    let falseString = rawFalseString;
    if (typeof falseString === "undefined" || !falseString) {
      falseString = "";
    }
    let testResult = null;
    switch (testString) {
      case "user":
        testResult = !!article.userName();
        break;
      case "talk":
        testResult = !!article.talkPage();
        break;
      case "admin":
        testResult = !!getValueOf("popupAdminLinks");
        break;
      case "oldid":
        testResult = !!(typeof oldid !== "undefined" && oldid);
        break;
      case "rcid":
        testResult = !!(typeof rcid !== "undefined" && rcid);
        break;
      case "ipuser":
        testResult = article.isIpUser();
        break;
      case "mainspace_en":
        testResult = isInMainNamespace(article) && siteState.hostname === "en.wikipedia.org";
        break;
      case "wikimedia":
        testResult = siteState.wikimedia;
        break;
      case "diff":
        testResult = !!(typeof diff !== "undefined" && diff);
        break;
    }
    switch (testResult) {
      case null:
        ret += splitted[i];
        break;
      case true:
        ret += trueString;
        break;
      case false:
        ret += falseString;
        break;
    }
    ret += splitted[i + numParens];
  }
  if (conditionalSplitRegex.test(ret) && recursionCount < 10) {
    return expandConditionalNavlinkString(ret, article, z, recursionCount + 1);
  }
  return ret;
};
const navlinkStringToArray = (_s, article, params) => {
  const s = expandConditionalNavlinkString(_s, article, params);
  const splitted = parenSplit(s, /<<(.*?)>>/);
  const ret = [];
  for (let i = 0; i < splitted.length; ++i) {
    if (i % 2) {
      const t = new NavlinkTag();
      const ss = splitted[i].split("|");
      t.id = ss[0];
      for (let j = 1; j < ss.length; ++j) {
        const sss = ss[j].split("=");
        if (sss.length > 1) {
          t[sss[0]] = sss[1];
        } else {
          t.text = popupString(sss[0]);
        }
      }
      t.article = article;
      const oldid = params.oldid, rcid = params.rcid, diff = params.diff;
      if (typeof oldid !== "undefined" && oldid !== null) {
        t.oldid = oldid;
      }
      if (typeof rcid !== "undefined" && rcid !== null) {
        t.rcid = rcid;
      }
      if (typeof diff !== "undefined" && diff !== null) {
        t.diff = diff;
      }
      if (!t.text && t.id !== "mainlink") {
        t.text = popupString(t.id);
      }
      ret.push(t);
    } else {
      ret.push(splitted[i]);
    }
  }
  return ret;
};
const navlinkSubstituteHTML = (s) => s.split("*").join(getValueOf("popupNavLinkSeparator")).split("<menurow>").join('<li class="popup_menu_row">').split("</menurow>").join("</li>").split("<menu>").join('<ul class="popup_menu">').split("</menu>").join("</ul>");
const navlinkDepth = (magic, s) => s.split(`<${magic}>`).length - s.split(`</${magic}>`).length;
const navlinkStringToHTML = (s, article, params) => {
  const p = navlinkStringToArray(s, article, params ?? {});
  let html = "";
  let menudepth = 0;
  let menurowdepth = 0;
  for (const item of p) {
    if (typeof item === "string") {
      html += navlinkSubstituteHTML(item);
      menudepth += navlinkDepth("menu", item);
      menurowdepth += navlinkDepth("menurow", item);
    } else {
      if (typeof item.type !== "undefined" && item.type === "navlinkTag") {
        if (menudepth > 0 && menurowdepth === 0) {
          html += `<li class="popup_menu_item">${item.html()}</li>`;
        } else {
          html += item.html();
        }
      }
    }
  }
  return html;
};
class NavlinkTag {
  constructor() {
    this.type = "navlinkTag";
  }
  html() {
    this.getNewWin();
    this.getPrintFunction();
    let html = "";
    const tagType = "span";
    const opening = `<${tagType} class="popup_${this.id}">`;
    const closing = `</${tagType}>`;
    if (typeof this.print !== "function") {
      errlog(`Oh dear - invalid print function for a navlinkTag, id=${this.id}`);
    } else {
      html = this.print(this);
      if (typeof html !== "string") {
        html = "";
      } else if (typeof this.shortcut !== "undefined") {
        html = addPopupShortcut(html, this.shortcut);
      }
    }
    return opening + String(html) + closing;
  }
  getNewWin() {
    getValueOf("popupLinksNewWindow");
    const linksNewWin = optionStore.popupLinksNewWindow;
    if (typeof linksNewWin?.[this.id] === "undefined") {
      this.newWin = null;
    }
    this.newWin = linksNewWin?.[this.id];
  }
  getPrintFunction() {
    if (typeof this.id !== "string" || typeof this.article !== typeof {}) {
      return;
    }
    this.noPopup = 1;
    switch (this.id) {
      case "contribs":
      case "history":
      case "whatLinksHere":
      case "userPage":
      case "monobook":
      case "userTalk":
      case "talk":
      case "article":
      case "lastEdit":
        this.noPopup = null;
    }
    switch (this.id) {
      case "email":
      case "contribs":
      case "block":
      case "unblock":
      case "userlog":
      case "userSpace":
      case "deletedContribs":
        this.article = assume$2(this.article.userName());
    }
    switch (this.id) {
      case "userTalk":
      case "newUserTalk":
      case "editUserTalk":
      case "userPage":
      case "monobook":
      case "editMonobook":
      case "blocklog":
        this.article = assume$2(this.article.userName(true));
        Reflect.deleteProperty(this, "oldid");
        break;
      case "pagelog":
      case "deletelog":
      case "protectlog":
        Reflect.deleteProperty(this, "oldid");
    }
    if (this.id === "editMonobook" || this.id === "monobook") {
      this.article.append("/monobook.js");
    }
    if (this.id !== "mainlink") {
      this.article = this.article.removeAnchor();
    }
    switch (this.id) {
      case "undelete":
        this.print = specialLink;
        this.specialpage = "Undelete";
        this.sep = "/";
        break;
      case "whatLinksHere":
        this.print = specialLink;
        this.specialpage = "Whatlinkshere";
        break;
      case "relatedChanges":
        this.print = specialLink;
        this.specialpage = "Recentchangeslinked";
        break;
      case "move":
        this.print = specialLink;
        this.specialpage = "Movepage";
        break;
      case "contribs":
        this.print = specialLink;
        this.specialpage = "Contributions";
        break;
      case "deletedContribs":
        this.print = specialLink;
        this.specialpage = "Deletedcontributions";
        break;
      case "email":
        this.print = specialLink;
        this.specialpage = "EmailUser";
        this.sep = "/";
        break;
      case "block":
        this.print = specialLink;
        this.specialpage = "Blockip";
        this.sep = "&ip=";
        break;
      case "unblock":
        this.print = specialLink;
        this.specialpage = "Ipblocklist";
        this.sep = "&action=unblock&ip=";
        break;
      case "userlog":
        this.print = specialLink;
        this.specialpage = "Log";
        this.sep = "&user=";
        break;
      case "blocklog":
        this.print = specialLink;
        this.specialpage = "Log";
        this.sep = "&type=block&page=";
        break;
      case "pagelog":
        this.print = specialLink;
        this.specialpage = "Log";
        this.sep = "&page=";
        break;
      case "protectlog":
        this.print = specialLink;
        this.specialpage = "Log";
        this.sep = "&type=protect&page=";
        break;
      case "deletelog":
        this.print = specialLink;
        this.specialpage = "Log";
        this.sep = "&type=delete&page=";
        break;
      case "userSpace":
        this.print = specialLink;
        this.specialpage = "PrefixIndex";
        this.sep = "&namespace=2&prefix=";
        break;
      case "search":
        this.print = specialLink;
        this.specialpage = "Search";
        this.sep = "&fulltext=Search&search=";
        break;
      case "thank":
        this.print = specialLink;
        this.specialpage = "Thanks";
        this.sep = "/";
        this.article.value = this.diff !== "prev" ? this.diff ?? null : this.oldid ?? null;
        break;
      case "unwatch":
      case "watch":
        this.print = magicWatchLink;
        this.action = `${this.id}&autowatchlist=1&autoimpl=${popupString("autoedit_version")}&actoken=${autoClickToken()}`;
        break;
      case "history":
      case "historyfeed":
      case "unprotect":
      case "protect":
        this.print = wikiLink;
        this.action = this.id;
        break;
      case "delete":
        this.print = wikiLink;
        this.action = "delete";
        if (this.article.namespaceId() === nsState.imageId) {
          const img = this.article.stripNamespace();
          this.action += `&image=${img}`;
        }
        break;
      case "markpatrolled":
      case "edit":
        Reflect.deleteProperty(this, "oldid");
        this.print = wikiLink;
        this.action = this.id;
        break;
      case "view":
      case "purge":
      case "render":
        this.print = wikiLink;
        this.action = this.id;
        break;
      case "raw":
        this.print = wikiLink;
        this.action = "raw";
        break;
      case "new":
        this.print = wikiLink;
        this.action = "edit&section=new";
        break;
      case "mainlink":
        if (typeof this.text === "undefined") {
          this.text = entify(this.article.toString());
        }
        if (getValueOf("popupSimplifyMainLink") && isInStrippableNamespace(this.article)) {
          const s = assume$2(this.text).split("/");
          this.text = s[s.length - 1];
          if (this.text === "" && s.length > 1) {
            this.text = s[s.length - 2];
          }
        }
        this.print = titledWikiLink;
        if (typeof this.title === "undefined" && typeof eventsState.current.link?.href !== "undefined") {
          this.title = safeDecodeURI(eventsState.current.link.originalTitle ? eventsState.current.link.originalTitle : this.article);
          if (typeof this.oldid !== "undefined" && this.oldid) {
            this.title = tprintf("Revision %s of %s", [this.oldid, this.title]);
          }
        }
        this.action = "view";
        break;
      case "userPage":
      case "article":
      case "monobook":
      case "editMonobook":
      case "editArticle":
        Reflect.deleteProperty(this, "oldid");
        this.article = this.article.articleFromTalkOrArticle();
        this.print = wikiLink;
        if (this.id.startsWith("edit")) {
          this.action = "edit";
        } else {
          this.action = "view";
        }
        break;
      case "userTalk":
      case "talk":
        this.article = assume$2(this.article.talkPage());
        Reflect.deleteProperty(this, "oldid");
        this.print = wikiLink;
        this.action = "view";
        break;
      case "arin":
        this.print = arinLink;
        break;
      case "count":
        this.print = editCounterLink;
        break;
      case "google":
        this.print = googleLink;
        break;
      case "editors":
        this.print = editorListLink;
        break;
      case "globalsearch":
        this.print = globalSearchLink;
        break;
      case "lastEdit":
        this.print = titledDiffLink;
        this.title = popupString("Show the last edit");
        this.from = "prev";
        this.to = "cur";
        break;
      case "oldEdit":
        this.print = titledDiffLink;
        this.title = `${popupString("Show the edit made to get revision")} ${String(this.oldid)}`;
        this.from = "prev";
        this.to = this.oldid;
        break;
      case "editOld":
        this.print = wikiLink;
        this.action = "edit";
        break;
      case "undo":
        this.print = wikiLink;
        this.action = "edit&undo=";
        break;
      case "revert":
        this.print = wikiLink;
        this.action = "revert";
        break;
      case "nullEdit":
        this.print = wikiLink;
        this.action = "nullEdit";
        break;
      case "diffCur":
        this.print = titledDiffLink;
        this.title = tprintf("Show changes since revision %s", [this.oldid]);
        this.from = this.oldid ?? null;
        this.to = "cur";
        break;
      case "editUserTalk":
      case "editTalk":
        Reflect.deleteProperty(this, "oldid");
        this.article = assume$2(this.article.talkPage());
        this.action = "edit";
        this.print = wikiLink;
        break;
      case "newUserTalk":
      case "newTalk":
        this.article = assume$2(this.article.talkPage());
        this.action = "edit&section=new";
        this.print = wikiLink;
        break;
      case "lastContrib":
      case "sinceMe":
        this.print = magicHistoryLink;
        break;
      case "togglePreviews":
        this.text = popupString(optionStore.simplePopups ? "enable previews" : "disable previews");
        this.print = popupMenuLink;
        break;
      case "disablePopups":
      case "purgePopups":
        this.print = popupMenuLink;
        break;
      default:
        this.print = function() {
          return `Unknown navlink type: ${this.id}`;
        };
    }
  }
}
const originalPopupTitle = (x) => {
  log("defaultstructure.popupTitle");
  if (!getValueOf("popupNavLinks")) {
    return navlinkStringToHTML("<b><<mainlink>></b>", x.article, x.params);
  }
  return "";
};
const originalPopupTopLinks = (x) => {
  log("defaultstructure.popupTopLinks");
  if (getValueOf("popupNavLinks")) {
    return navLinksHTML(x.article, x.hint, x.params);
  }
  return "";
};
const nostalgiaPopupTopLinks = (x) => {
  let str = "";
  str += "<b><<mainlink|shortcut= >></b>";
  str += "if(user){<br><<contribs|shortcut=c>>";
  str += "if(wikimedia){*<<count|shortcut=#>>}";
  str += "if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>}}";
  const editstr = "<<edit|shortcut=e>>";
  const editOldidStr = `if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{${editstr}}`;
  const historystr = "<<history|shortcut=h>>";
  const watchstr = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
  str += `<br>if(talk){${editOldidStr}|<<new|shortcut=+>>*${historystr}*${watchstr}*<b><<article|shortcut=a>></b>|<<editArticle|edit>>}else{${editOldidStr}*${historystr}*${watchstr}*<b><<talk|shortcut=t>></b>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>}`;
  str += "<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>";
  str += "if(admin){<br>}else{*}<<move|shortcut=m>>";
  str += "if(admin){*<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*<<undelete|undeleteShort>>|<<delete|shortcut=d>>}";
  return navlinkStringToHTML(str, x.article, x.params);
};
const fancyPopupTitle = (x) => navlinkStringToHTML("<font size=+0><<mainlink>></font>", x.article, x.params);
const fancyPopupTopLinks = (x) => {
  const hist = "<<history|shortcut=h|hist>>|<<lastEdit|shortcut=/|last>>|<<editors|shortcut=E|eds>>";
  const watch = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
  const move = "<<move|shortcut=m|move>>";
  return navlinkStringToHTML(`if(talk){<<edit|shortcut=e>>|<<new|shortcut=+|+>>*${hist}*<<article|shortcut=a>>|<<editArticle|edit>>*${watch}*${move}}else{<<edit|shortcut=e>>*${hist}*<<talk|shortcut=t|>>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>*${watch}*${move}}<br>`, x.article, x.params);
};
const fancyPopupOtherLinks = (x) => {
  const admin = "<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*<<undelete|undeleteShort>>|<<delete|shortcut=d|del>>";
  let user = "<<contribs|shortcut=c>>if(wikimedia){|<<count|shortcut=#|#>>}";
  user += `if(ipuser){|<<arin>>}else{*<<email|shortcut=E|${popupString("email")}>>}if(admin){*<<block|shortcut=b>>}`;
  const normal = "<<whatLinksHere|shortcut=l|links here>>*<<relatedChanges|shortcut=r|related>>";
  return navlinkStringToHTML(`<br>if(user){${user}*}if(admin){${admin}if(user){<br>}else{*}}${normal}`, x.article, x.params);
};
const fancy2PopupTopLinks = (x) => `<br>${fancyPopupTopLinks(x).replace(/<br>$/i, "")}`;
const menusPopupTopLinks = (x, shorter) => {
  const s = [];
  const dropclass = "popup_drop";
  const enddiv = "</div>";
  let hist = "<<history|shortcut=h>>";
  if (!shorter) {
    hist = `<menurow>${hist}|<<historyfeed|rss>>|<<editors|shortcut=E>></menurow>`;
  }
  const lastedit = "<<lastEdit|shortcut=/|show last edit>>";
  const thank = "if(diff){<<thank|send thanks>>}";
  const jsHistory = "<<lastContrib|last set of edits>><<sinceMe|changes since mine>>";
  const linkshere = "<<whatLinksHere|shortcut=l|what links here>>";
  const related = "<<relatedChanges|shortcut=r|related changes>>";
  const search = "<menurow><<search|shortcut=s>>if(wikimedia){|<<globalsearch|shortcut=g|global>>}|<<google|shortcut=G|web>></menurow>";
  const watch = "<menurow><<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>></menurow>";
  const protect = "<menurow><<unprotect|unprotectShort>>|<<protect|shortcut=p>>|<<protectlog|log>></menurow>";
  const del = "<menurow><<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>></menurow>";
  const move = "<<move|shortcut=m|move page>>";
  const nullPurge = "<menurow><<nullEdit|shortcut=n|null edit>>|<<purge|shortcut=P>></menurow>";
  const viewOptions = "<menurow><<view|shortcut=v>>|<<render|shortcut=S>>|<<raw>></menurow>";
  const editRow = "if(oldid){<menurow><<edit|shortcut=e>>|<<editOld|shortcut=e|this&nbsp;revision>></menurow><menurow><<revert|shortcut=v>>|<<undo>></menurow>}else{<<edit|shortcut=e>>}";
  const markPatrolled = "if(rcid){<<markpatrolled|mark patrolled>>}";
  const newTopic = "if(talk){<<new|shortcut=+|new topic>>}";
  const protectDelete = `if(admin){${protect}${del}}`;
  if (getValueOf("popupActionsMenu")) {
    s.push(`<<mainlink>>*${menuTitle(dropclass, "actions")}`);
  } else {
    s.push(`<div class="${dropclass}"><<mainlink>>`);
  }
  s.push("<menu>");
  s.push(editRow + markPatrolled + newTopic + hist + lastedit + thank);
  if (!shorter) {
    s.push(jsHistory);
  }
  s.push(move + linkshere + related);
  if (!shorter) {
    s.push(nullPurge + search);
  }
  if (!shorter) {
    s.push(viewOptions);
  }
  s.push(`<hr />${watch}${protectDelete}`);
  s.push(`<hr />if(talk){<<article|shortcut=a|view article>><<editArticle|edit article>>}else{<<talk|shortcut=t|talk page>><<editTalk|edit talk>><<newTalk|shortcut=+|new topic>>}</menu>${enddiv}`);
  const email = "<<email|shortcut=E|email user>>";
  const contribs = "if(wikimedia){<menurow>}<<contribs|shortcut=c|contributions>>if(wikimedia){</menurow>}if(admin){<menurow><<deletedContribs>></menurow>}";
  s.push(`if(user){*${menuTitle(dropclass, "user")}`);
  s.push("<menu>");
  s.push("<menurow><<userPage|shortcut=u|user&nbsp;page>>|<<userSpace|space>></menurow>");
  s.push("<<userTalk|shortcut=t|user talk>><<editUserTalk|edit user talk>><<newUserTalk|shortcut=+|leave comment>>");
  if (!shorter) {
    s.push(`if(ipuser){<<arin>>}else{${email}}`);
  } else {
    s.push(`if(ipuser){}else{${email}}`);
  }
  s.push(`<hr />${contribs}<<userlog|shortcut=L|user log>>`);
  s.push("if(wikimedia){<<count|shortcut=#|edit counter>>}");
  s.push("if(admin){<menurow><<unblock|unblockShort>>|<<block|shortcut=b|block user>></menurow>}");
  s.push("<<blocklog|shortcut=B|block log>>");
  s.push(`</menu>${enddiv}}`);
  if (getValueOf("popupSetupMenu") && !x.navpop.hasPopupMenu) {
    x.navpop.hasPopupMenu = true;
    s.push(`*${menuTitle(dropclass, "popupsMenu")}<menu>`);
    s.push("<<togglePreviews|toggle previews>>");
    s.push("<<purgePopups|reset>>");
    s.push("<<disablePopups|disable>>");
    s.push(`</menu>${enddiv}`);
  }
  return navlinkStringToHTML(s.join(""), x.article, x.params);
};
const menuTitle = (dropclass, s) => {
  const text = popupString(s);
  const len = text.length;
  return `<div class="${dropclass}" style="--navpop-m-len:${len}ch"><a href="#" noPopup=1>${text}</a>`;
};
const shortmenusPopupTopLinks = (x) => menusPopupTopLinks(x, true);
const litePopupTitle = (x) => {
  log(`${String(x.article)}: structures.lite.popupTitle`);
  return `<div><span class="popup_mainlink"><b>${String(x.article)}</b></span></div>`;
};
registerSlotFiller("original.popupTitle", originalPopupTitle);
registerSlotFiller("original.popupTopLinks", originalPopupTopLinks);
registerSlotFiller("nostalgia.popupTopLinks", nostalgiaPopupTopLinks);
registerSlotFiller("fancy.popupTitle", fancyPopupTitle);
registerSlotFiller("fancy.popupTopLinks", fancyPopupTopLinks);
registerSlotFiller("fancy.popupOtherLinks", fancyPopupOtherLinks);
registerSlotFiller("fancy2.popupTopLinks", fancy2PopupTopLinks);
registerSlotFiller("menus.popupTopLinks", menusPopupTopLinks);
registerSlotFiller("shortmenus.popupTopLinks", shortmenusPopupTopLinks);
registerSlotFiller("lite.popupTitle", litePopupTitle);

const setupDebugging = () => {
  log("Initializing logger");
};
const setMisc = () => {
  eventsState.current.link = null;
  eventsState.current.links = [];
  eventsState.current.linksHash = {};
  clearPages();
  eventsState.checkPopupPositionTimer = null;
  eventsState.idNumber = 0;
  setPopupIdNumber(eventsState.idNumber);
  wiki.misc.decodeExtras = [
    {
      from: "%2C",
      to: ","
    },
    {
      from: "_",
      to: " "
    },
    {
      from: "%24",
      to: "$"
    },
    {
      from: "%26",
      to: "&"
    }
  ];
};
const instaSiteConfig = () => {
  const formattedNamespaces = mw.config.get("wgFormattedNamespaces");
  return {
    articlePath: siteState.articlePath,
    interwiki: nsState.interwiki,
    imageNamespace: formattedNamespaces[nsState.imageId],
    categoryNamespace: formattedNamespaces[nsState.categoryId]
  };
};
const setupPopups = async (callback) => {
  if (setupPopups.completed) {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }
  const markSetupCompleted = () => {
    setupPopups.completed = true;
    if (typeof callback === "function") {
      callback();
    }
  };
  await fetchSpecialPageNames();
  setupDebugging();
  setSiteInfo();
  setTitleBase();
  setOptions();
  void setUserInfo();
  setNamespaces();
  setInterwiki();
  setRegexps();
  setRedirs();
  setMisc();
  setupLivePreview(instaSiteConfig());
  setupTooltips();
  log("In setupPopups(), just called setupTooltips()");
  Navpopup.tracker.enable();
  markSetupCompleted();
};
const boot = () => {
  registerSetupPopups(setupPopups);
  registerModifyWatchlist(modifyWatchlist);
  registerAbortAll(abortAllDownloads);
  cleanupLegacyNoTranslationStorage();
  window.popupNoTranslation = popupNoTranslation;
  autoEdit();
  void setupPopups();
};

const state = {
  fn: {
    APIsharedImagePagePreviewHTML,
    getLastContrib,
    getDiffSinceMyEdit,
    purgePopups,
    disablePopups,
    togglePreviews,
    modifyWatchlist,
    magicWatchLink,
    magicHistoryLink,
    popupMenuLink
  },
  option: optionStore,
  string: englishStrings,
  wiki: siteState
};

const alreadyLoaded = !!window.pg && !(window.pg instanceof HTMLElement);
if (!alreadyLoaded) {
  window.pg = state;
  $(() => {
    if (document.readyState === "complete") {
      boot();
    } else {
      $(window).on("load", () => {
        boot();
      });
    }
    let once = true;
    const dynamicContentHandler = ($content) => {
      if ($content.attr("id") === "mw-content-text") {
        if (once) {
          once = false;
          return;
        }
      }
      const registerHooksForVisibleNavpops = () => {
        for (const link of eventsState.current.links) {
          const navpop = link.navpopup;
          if (!navpop?.isVisible()) {
            continue;
          }
          Navpopup.tracker.addHook(posCheckerHook(navpop));
        }
      };
      const doIt = () => {
        registerHooksForVisibleNavpops();
        $content.each(function() {
          this.ranSetupTooltipsAlready = false;
          setupTooltips(this);
        });
      };
      void setupPopups(doIt);
    };
    document.querySelectorAll(".mw-parser-output").forEach((content) => {
      dynamicContentHandler($(content));
    });
    mw.hook("wikipage.content").add(dynamicContentHandler);
    mw.hook("ext.echo.overlay.beforeShowingOverlay").add(($overlay) => {
      dynamicContentHandler($overlay.find(".mw-echo-state"));
    });
  });
}
