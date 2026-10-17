// 页面统计信息域：popupData 槽的 8 个默认过滤器与 getPageInfo 装配。
// 行为基准 = legacy src/modules/pageinfo.ts（commit 02c8dec）。
//
// 过滤器契约：(wikitext, download, article?) → truthy 文案 | ""/false/undefined；
// truthy 结果按注册顺序以 popupString("comma") 连接、upcaseFirst 首字母大写后
// 进槽。默认 8 件的注册顺序在 options.ts 的 popupFilters 默认值里（小作品 →
// 消歧义 → 页面大小 → 内链 → 图片 → 分类 → 最后修改 → wikibase）。
import type { Moment } from "moment";
import { getValueOf } from "../core/options.ts";
import { popupString, tprintf } from "../core/strings.ts";
import type { Downloader } from "../net/downloader.ts";
import { upcaseFirst } from "../title/namespaces.ts";
import { isDisambig, parenSplit, stubCount, wiki, type Title } from "../title/title.ts";

type PopupFilterFn = (data: string, download: Downloader, article?: Title) => string | false | undefined;

export const popupFilterPageSize = (data: string): string => formatBytes(data.length);

export const popupFilterCountLinks = (data: string): string => {
    const num = countLinks(data);
    return `${num}&nbsp;${num !== 1 ? popupString("wikiLinks") : popupString("wikiLink")}`;
};

export const popupFilterCountImages = (data: string): string => {
    const num = countImages(data);
    return `${num}&nbsp;${num !== 1 ? popupString("images") : popupString("image")}`;
};

export const popupFilterCountCategories = (data: string): string => {
    const num = countCategories(data);
    return `${num}&nbsp;${num !== 1 ? popupString("categories") : popupString("category")}`;
};

export const popupFilterLastModified = (_data: string, download: Downloader): string => {
    const lastmod = download.lastModified;
    // legacy 先构造 moment 再判空：lastmod 为 null 时产出 Invalid moment 后丢弃，
    // 无用户可见差异——求值顺序照搬勿修
    const age = moment(lastmod);
    if (lastmod && getValueOf("popupLastModified")) {
        return tprintf("%s old", [formatAge(age)]).replace(/ /g, "&nbsp;");
    }
    return "";
};

export const popupFilterWikibaseItem = (_data: string, download: Downloader): string => {
    if (!download.wikibaseItem || !download.wikibaseRepo) {
        return "";
    }
    // 模板键 '<a href="%s">%s</a>' 不在任何翻译表：popupString 首查会把键记入
    // popupNoTranslation 并 console.info 一次（legacy 原样噪声，照搬勿修）
    return tprintf('<a href="%s">%s</a>', [
        download.wikibaseRepo.replace(/\$1/g, download.wikibaseItem),
        download.wikibaseItem,
    ]);
};

// 〔萌百〕与上游的粗略相对时间不同，这里用 moment 的本地日历字段逐级借位求
// 精确差值（年/月/天/小时/分/秒），单位文案经 popupStrings 取中文。
// 显示怪癖照搬：一旦某个高位有产出，后续全 0 低位也补「0单位」（如整 1 年 =>
// 1年0月0天0小时0分0秒）；结尾的 (\d) 空格压缩把「5 秒」之类的数字后空格去掉。
const formatAge = (age: Moment): string => {
    const now = moment();
    const isBefore = age.isBefore(now);
    const monthsHave31Days = [0, 2, 4, 6, 7, 9, 11]; // 月份从 0 开始
    let year = isBefore ? now.year() - age.year() : age.year() - now.year(),
        month = isBefore ? now.month() - age.month() : age.month() - now.month(),
        day = isBefore ? now.date() - age.date() : age.date() - now.date(),
        hour = isBefore ? now.hour() - age.hour() : age.hour() - now.hour(),
        minute = isBefore ? now.minute() - age.minute() : age.minute() - now.minute(),
        second = isBefore ? now.second() - age.second() : age.second() - now.second();
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
        // 借位天数按「较早一侧」所在月的天数回补（isBefore 时较早侧是 age，
        // 未来时刻则是 now）——月份从 0 开始
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

const addunit = (num: number, str: string): string => `${num} ${num !== 1 ? popupString(`${str}s`) : popupString(str)}`;

const runPopupFilters = (list: PopupFilterFn[], data: string, download: Downloader): string[] => {
    const ret: string[] = [];
    for (const filter of list) {
        // popupFilters 经 window 覆盖链是用户可配置项，可能混入 null/非函数值：
        // 跳过而非崩溃（legacy 原样）
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 类型层是函数数组；运行时用户配置可掺入非函数
        if (filter && typeof filter === "function") {
            // 第三参取归属弹窗的当前条目（legacy 的 download.owner?.article）；
            // DownloadOwner 最小接口不含 article，真实运行时由完整 Navpopup 提供
            const owner = download.owner as unknown as { article?: Title } | null | undefined;
            const s = filter(data, download, owner?.article);
            if (s) {
                ret.push(s);
            }
        }
    }
    return ret;
};

export const getPageInfo = (data: string, download: Downloader): string => {
    // 第二判冗余（!data 已覆盖空串）——legacy 写法照搬
    if (!data || data.length === 0) {
        return popupString("Empty page");
    }
    const popupFilters = (getValueOf("popupFilters") ?? []) as PopupFilterFn[];
    const extraPopupFilters = (getValueOf("extraPopupFilters") ?? []) as PopupFilterFn[];
    const pageInfoArray = runPopupFilters(popupFilters.concat(extraPopupFilters), data, download);
    let pageInfo = pageInfoArray.join(popupString("comma"));
    if (pageInfo !== "") {
        pageInfo = upcaseFirst(pageInfo);
    }
    return pageInfo;
};

// 统计 "[[" 出现次数：简单启发式，图片/分类链接同样计入（legacy 原样）
const countLinks = (wikiText: string): number => wikiText.split("[[").length - 1;

// wiki.re.image（boot 按选项 popupImageVarsRegexp 构造）是含 6 个捕获组的分支
// 正则：split 为每次命中插入 1+6 个片段（未参与的组插入 undefined），故除以
// bracketCount+1 才还原命中数；别名分支与 infobox 变量分支共用该组数。
// 断言风格规则偏好 !，但项目禁非空断言——as 断言与 legacy 写法等价
// eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style -- re.* 装配前为 null；此处沿用 legacy 的 as 断言
const countImages = (wikiText: string): number => (parenSplit(wikiText, wiki.re.image as RegExp).length - 1) / ((wiki.re.imageBracketCount as number) + 1);

// 同上：分类正则含 1 个捕获组，除以 bracketCount+1 = 2
// eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style -- re.* 装配前为 null；此处沿用 legacy 的 as 断言
const countCategories = (wikiText: string): number => (parenSplit(wikiText, wiki.re.category as RegExp).length - 1) / ((wiki.re.categoryBracketCount as number) + 1);

export const popupFilterStubDetect = (data: string, _download: Downloader, article: Title): string => {
    const counts = stubCount(data, article);
    if (counts && counts.real) {
        return popupString("stub");
    }
    if (counts && counts.sect) {
        return popupString("section stub");
    }
    return "";
};

export const popupFilterDisambigDetect = (data: string, _download: Downloader, article: Title): string => {
    // 命名空间门控在 titles.isDisambig 里还会再查一次——双重判定是 legacy 原样
    if (!getValueOf("popupAllDabsStubs") && article.namespace()) {
        return "";
    }
    return isDisambig(data, article) ? popupString("disambig") : "";
};

// >949 字节转 kB：Math.round(num/100)/10 保留一位小数（950 → 1、1234 → 1.2），
// 「以1000为一进」的口径由萌百 kB 译注向用户说明；此处不带 &nbsp;（legacy 原样）
const formatBytes = (num: number): string => num > 949 ? `${Math.round(num / 100) / 10}${popupString("kB")}` : `${num}&nbsp;${popupString("bytes")}`;
