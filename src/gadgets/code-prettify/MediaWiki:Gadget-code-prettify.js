"use strict";
/**
 * @file 引自 https://github.com/google/code-prettify/blob/master/src/prettify.js，遵守 APL2.0 协议，Copyright (C) 2006 Google Inc.
 */
// 使用本js只是为了方便无法获得Google的js的用户使用，本文件各项权利按下列声明归各自所有者所有
// 595行追加了加行号id属性功能
/* https://github.com/google/code-prettify/blob/master/src/prettify.js */
// <pre>
$(() => {
    if (mw.config.get("wgPageName").match(/\.js$/)) {
        $(".mw-code").addClass("prettyprint lang-js");
    }
    if (mw.config.get("wgPageName").match(/\.css$/)) {
        $(".mw-code").addClass("prettyprint lang-css");
    }
    const acceptsLangs = {
        ts: "ts",
        typescript: "ts",
        js: "js",
        javascript: "js",
        json: "json",
        css: "css",
        htm: "html",
        html: "html",
        xml: "xml",
        scribunto: "lua",
        lua: "lua",
        php: "php",
        regex: "regex",
        latex: "latex",
        tex: "latex",
        wiki: "wiki",
        wikitext: "wiki",
        mediawiki: "wiki",
        mw: "wiki",
    };
    const wgPageContentModel = mw.config.get("wgPageContentModel", "").toLowerCase();
    if (wgPageContentModel in acceptsLangs) {
        $(".mw-code").addClass(`prettyprint lang-${acceptsLangs[wgPageContentModel]}`);
    }
    $("pre[lang]").each(function () {
        const self = $(this);
        const lang = self.attr("lang").toLowerCase();
        if (lang in acceptsLangs) {
            self.addClass(`prettyprint lang-${acceptsLangs[lang]}`);
        }
    });
    if ($('.prettyprint[class*=" lang-"]').length === 0) {
        return;
    }
    $('pre.prettyprint[class*=" lang-"]').each((_, ele) => {
        const start = ele.dataset.start;
        if (/^[1-9]\d*$/.test(start)) {
            $(ele).removeClass("linenums").addClass(`linenums:${start}`);
        } else {
            $(ele).addClass("linenums");
        }
    });

    /**
     * @license
     * Copyright (C) 2006 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *      http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const PR_SHOULD_USE_CONTINUATION = true;

    window.PR_SHOULD_USE_CONTINUATION = PR_SHOULD_USE_CONTINUATION;

    const FLOW_CONTROL_KEYWORDS = ["break,continue,do,else,for,if,return,while"];
    const C_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "auto,case,char,const,default," + "double,enum,extern,float,goto,inline,int,long,register,restrict,short,signed," + "sizeof,static,struct,switch,typedef,union,unsigned,void,volatile"];
    const COMMON_KEYWORDS = [C_KEYWORDS, "catch,class,delete,false,import," + "new,operator,private,protected,public,this,throw,true,try,typeof"];
    const CPP_KEYWORDS = [COMMON_KEYWORDS, "alignas,alignof,align_union,asm,axiom,bool," + "concept,concept_map,const_cast,constexpr,decltype,delegate," + "dynamic_cast,explicit,export,friend,generic,late_check," + "mutable,namespace,noexcept,noreturn,nullptr,property,reinterpret_cast,static_assert," + "static_cast,template,typeid,typename,using,virtual,where"];
    const JAVA_KEYWORDS = [COMMON_KEYWORDS, "abstract,assert,boolean,byte,extends,finally,final,implements,import," + "instanceof,interface,null,native,package,strictfp,super,synchronized," + "throws,transient"];
    const CSHARP_KEYWORDS = [COMMON_KEYWORDS, "abstract,add,alias,as,ascending,async,await,base,bool,by,byte,checked,decimal,delegate,descending," + "dynamic,event,finally,fixed,foreach,from,get,global,group,implicit,in,interface," + "internal,into,is,join,let,lock,null,object,out,override,orderby,params," + "partial,readonly,ref,remove,sbyte,sealed,select,set,stackalloc,string,select,uint,ulong," + "unchecked,unsafe,ushort,value,var,virtual,where,yield"];
    const COFFEE_KEYWORDS = "all,and,by,catch,class,else,extends,false,finally," + "for,if,in,is,isnt,loop,new,no,not,null,of,off,on,or,return,super,then," + "throw,true,try,unless,until,when,while,yes";
    const JSCRIPT_KEYWORDS = [COMMON_KEYWORDS, "abstract,async,await,constructor,debugger,enum,eval,export,from,function," + "get,import,implements,instanceof,interface,let,null,of,set,undefined," + "var,with,yield,Infinity,NaN"];
    const PERL_KEYWORDS = "caller,delete,die,do,dump,elsif,eval,exit,foreach,for," + "goto,if,import,last,local,my,next,no,our,print,package,redo,require," + "sub,undef,unless,until,use,wantarray,while,BEGIN,END";
    const PYTHON_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "and,as,assert,class,def,del," + "elif,except,exec,finally,from,global,import,in,is,lambda," + "nonlocal,not,or,pass,print,raise,try,with,yield," + "False,True,None"];
    const RUBY_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "alias,and,begin,case,class," + "def,defined,elsif,end,ensure,false,in,module,next,nil,not,or,redo," + "rescue,retry,self,super,then,true,undef,unless,until,when,yield," + "BEGIN,END"];
    const SH_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "case,done,elif,esac,eval,fi," + "function,in,local,set,then,until"];
    const ALL_KEYWORDS = [CPP_KEYWORDS, CSHARP_KEYWORDS, JAVA_KEYWORDS, JSCRIPT_KEYWORDS, PERL_KEYWORDS, PYTHON_KEYWORDS, RUBY_KEYWORDS, SH_KEYWORDS];
    const C_TYPES = /^(DIR|FILE|array|vector|(de|priority_)?queue|(forward_)?list|stack|(const_)?(reverse_)?iterator|(unordered_)?(multi)?(set|map)|bitset|u?(int|float)\d*)\b/;
    const PR_STRING = "str";
    const PR_KEYWORD = "kwd";
    const PR_COMMENT = "com";
    const PR_TYPE = "typ";
    const PR_LITERAL = "lit";
    const PR_PUNCTUATION = "pun";
    const PR_PLAIN = "pln";
    const PR_TAG = "tag";
    const PR_DECLARATION = "dec";
    const PR_SOURCE = "src";
    const PR_ATTRIB_NAME = "atn";
    const PR_ATTRIB_VALUE = "atv";
    const PR_NOCODE = "nocode";
    const REGEXP_PRECEDER_PATTERN = "(?:^^\\.?|[+-]|[!=]=?=?|\\#|%=?|&&?=?|\\(|\\*=?|[+\\-]=|->|\\/=?|::?|<<?=?|>>?>?=?|,|;|\\?|@|\\[|~|{|\\^\\^?=?|\\|\\|?=?|break|case|continue|delete|do|else|finally|instanceof|return|throw|try|typeof)\\s*";

    function combinePrefixPatterns(regexs) {
        let capturedGroupIndex = 0;
        let needToFoldCase = false;
        let ignoreCase = false;
        for (let i = 0, n = regexs.length; i < n; ++i) {
            const regex = regexs[i];
            if (regex.ignoreCase) {
                ignoreCase = true;
            } else if (/[a-z]/i.test(regex.source.replace(/\\u[0-9a-f]{4}|\\x[0-9a-f]{2}|\\[^ux]/gi, ""))) {
                needToFoldCase = true;
                ignoreCase = false;
                break;
            }
        }
        const escapeCharToCodeUnit = {
            b: 8,
            t: 9,
            n: 10,
            v: 11,
            f: 12,
            r: 13,
        };

        function decodeEscape(charsetPart) {
            let cc0 = charsetPart.charCodeAt(0);
            if (cc0 !== 92) {
                return cc0;
            }
            const c1 = charsetPart.charAt(1);
            cc0 = escapeCharToCodeUnit[c1];
            if (cc0) {
                return cc0;
            } else if ("0" <= c1 && c1 <= "7") {
                return parseInt(charsetPart.substring(1), 8);
            } else if (c1 === "u" || c1 === "x") {
                return parseInt(charsetPart.substring(2), 16);
            }
            return charsetPart.charCodeAt(1);

        }

        function encodeEscape(charCode) {
            if (charCode < 32) {
                return (charCode < 16 ? "\\x0" : "\\x") + charCode.toString(16);
            }
            const ch = String.fromCharCode(charCode);
            return ch === "\\" || ch === "-" || ch === "]" || ch === "^" ? `\\${ch}` : ch;
        }

        function caseFoldCharset(charSet) {
            const charsetParts = charSet.substring(1, charSet.length - 1).match(new RegExp("\\\\u[0-9A-Fa-f]{4}" + "|\\\\x[0-9A-Fa-f]{2}" + "|\\\\[0-3][0-7]{0,2}" + "|\\\\[0-7]{1,2}" + "|\\\\[\\s\\S]" + "|-" + "|[^-\\\\]", "g"));
            const ranges = [];
            const inverse = charsetParts[0] === "^";
            const out = ["["];
            if (inverse) {
                out.push("^");
            }
            for (let i = inverse ? 1 : 0, n = charsetParts.length; i < n; ++i) {
                const p = charsetParts[i];
                if (/\\[bdsw]/i.test(p)) {
                    out.push(p);
                } else {
                    const start = decodeEscape(p);
                    let end;
                    if (i + 2 < n && "-" === charsetParts[i + 1]) {
                        end = decodeEscape(charsetParts[i + 2]);
                        i += 2;
                    } else {
                        end = start;
                    }
                    ranges.push([start, end]);
                    if (!(end < 65 || start > 122)) {
                        if (!(end < 65 || start > 90)) {
                            ranges.push([Math.max(65, start) | 32, Math.min(end, 90) | 32]);
                        }
                        if (!(end < 97 || start > 122)) {
                            ranges.push([Math.max(97, start) & ~32, Math.min(end, 122) & ~32]);
                        }
                    }
                }
            }
            ranges.sort((a, b) => {
                return a[0] - b[0] || b[1] - a[1];
            });
            const consolidatedRanges = [];
            let lastRange = [];
            for (let i = 0; i < ranges.length; ++i) {
                const range = ranges[i];
                if (range[0] <= lastRange[1] + 1) {
                    lastRange[1] = Math.max(lastRange[1], range[1]);
                } else {
                    consolidatedRanges.push(lastRange = range);
                }
            }
            for (let i = 0; i < consolidatedRanges.length; ++i) {
                const range = consolidatedRanges[i];
                out.push(encodeEscape(range[0]));
                if (range[1] > range[0]) {
                    if (range[1] + 1 > range[0]) {
                        out.push("-");
                    }
                    out.push(encodeEscape(range[1]));
                }
            }
            out.push("]");
            return out.join("");
        }

        function allowAnywhereFoldCaseAndRenumberGroups(regex) {
            const parts = regex.source.match(new RegExp("(?:" + "\\[(?:[^\\x5C\\x5D]|\\\\[\\s\\S])*\\]" + "|\\\\u[A-Fa-f0-9]{4}" + "|\\\\x[A-Fa-f0-9]{2}" + "|\\\\[0-9]+" + "|\\\\[^ux0-9]" + "|\\(\\?[:!=]" + "|[\\(\\)\\^]" + "|[^\\x5B\\x5C\\(\\)\\^]+" + ")", "g"));
            const n = parts.length;
            const capturedGroups = [];
            for (let i = 0, groupIndex = 0; i < n; ++i) {
                const p = parts[i];
                if (p === "(") {
                    ++groupIndex;
                } else if ("\\" === p.charAt(0)) {
                    const decimalValue = +p.substring(1);
                    if (decimalValue) {
                        if (decimalValue <= groupIndex) {
                            capturedGroups[decimalValue] = -1;
                        } else {
                            parts[i] = encodeEscape(decimalValue);
                        }
                    }
                }
            }
            for (let i = 1; i < capturedGroups.length; ++i) {
                if (-1 === capturedGroups[i]) {
                    capturedGroups[i] = ++capturedGroupIndex;
                }
            }
            for (let i = 0, groupIndex = 0; i < n; ++i) {
                const p = parts[i];
                if (p === "(") {
                    ++groupIndex;
                    if (!capturedGroups[groupIndex]) {
                        parts[i] = "(?:";
                    }
                } else if ("\\" === p.charAt(0)) {
                    const decimalValue = +p.substring(1);
                    if (decimalValue && decimalValue <= groupIndex) {
                        parts[i] = `\\${capturedGroups[decimalValue]}`;
                    }
                }
            }
            for (let i = 0; i < n; ++i) {
                if ("^" === parts[i] && "^" !== parts[i + 1]) {
                    parts[i] = "";
                }
            }
            if (regex.ignoreCase && needToFoldCase) {
                for (let i = 0; i < n; ++i) {
                    const p = parts[i];
                    const ch0 = p.charAt(0);
                    if (p.length >= 2 && ch0 === "[") {
                        parts[i] = caseFoldCharset(p);
                    } else if (ch0 !== "\\") {
                        parts[i] = p.replace(/[a-zA-Z]/g, (ch) => {
                            const cc = ch.charCodeAt(0);
                            return `[${String.fromCharCode(cc & ~32, cc | 32)}]`;
                        });
                    }
                }
            }
            return parts.join("");
        }
        const rewritten = [];
        for (let i = 0, n = regexs.length; i < n; ++i) {
            const regex = regexs[i];
            if (regex.global || regex.multiline) {
                throw new Error(`${regex}`);
            }
            rewritten.push(`(?:${allowAnywhereFoldCaseAndRenumberGroups(regex)})`);
        }
        return new RegExp(rewritten.join("|"), ignoreCase ? "gi" : "g");
    }

    function extractSourceSpans(node, isPreformatted) {
        const nocode = /(?:^|\s)nocode(?:\s|$)/;
        const chunks = [];
        let length = 0;
        const spans = [];
        let k = 0;

        function walk(node) {
            const type = node.nodeType;
            if (type === 1) {
                if (nocode.test(node.className)) {
                    return;
                }
                for (let child = node.firstChild; child; child = child.nextSibling) {
                    walk(child);
                }
                const nodeName = node.nodeName.toLowerCase();
                if ("br" === nodeName || "li" === nodeName) {
                    chunks[k] = "\n";
                    spans[k << 1] = length++;
                    spans[k++ << 1 | 1] = node;
                }
            } else if (type === 3 || type === 4) {
                let text = node.nodeValue;
                if (text.length) {
                    if (!isPreformatted) {
                        text = text.replace(/[ \t\r\n]+/g, " ");
                    } else {
                        text = text.replace(/\r\n?/g, "\n");
                    }
                    chunks[k] = text;
                    spans[k << 1] = length;
                    length += text.length;
                    spans[k++ << 1 | 1] = node;
                }
            }
        }
        walk(node);
        return {
            sourceCode: chunks.join("").replace(/\n$/, ""),
            spans: spans,
        };
    }

    function appendDecorations(sourceNode, basePos, sourceCode, langHandler, out) {
        if (!sourceCode) {
            return;
        }
        const job = {
            sourceNode: sourceNode,
            pre: 1,
            langExtension: null,
            numberLines: null,
            sourceCode: sourceCode,
            spans: null,
            basePos: basePos,
            decorations: null,
        };
        langHandler(job);
        out.push(...job.decorations);
    }
    const notWs = /\S/;

    function childContentWrapper(element) {
        let wrapper = undefined;
        for (let c = element.firstChild; c; c = c.nextSibling) {
            const type = c.nodeType;
            wrapper = type === 1 ? wrapper ? element : c : type === 3 ? notWs.test(c.nodeValue) ? element : wrapper : wrapper;
        }
        return wrapper === element ? undefined : wrapper;
    }

    function createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns) {
        const shortcuts = {};
        let tokenizer;
        (function () {
            const allPatterns = shortcutStylePatterns.concat(fallthroughStylePatterns);
            const allRegexs = [];
            const regexKeys = {};
            for (let i = 0, n = allPatterns.length; i < n; ++i) {
                const patternParts = allPatterns[i];
                const shortcutChars = patternParts[3];
                if (shortcutChars) {
                    for (let c = shortcutChars.length; --c >= 0;) {
                        shortcuts[shortcutChars.charAt(c)] = patternParts;
                    }
                }
                const regex = patternParts[1];
                const k = `${regex}`;
                if (!Object.prototype.hasOwnProperty.bind(regexKeys)(k)) {
                    allRegexs.push(regex);
                    regexKeys[k] = null;
                }
            }
            allRegexs.push(/[\0-\uffff]/);
            tokenizer = combinePrefixPatterns(allRegexs);
        })();
        const nPatterns = fallthroughStylePatterns.length;
        const decorate = function (job) {
            const sourceCode = job.sourceCode,
                basePos = job.basePos;
            const sourceNode = job.sourceNode;
            const decorations = [basePos, PR_PLAIN];
            let pos = 0;
            const tokens = sourceCode.match(tokenizer) || [];
            const styleCache = {};
            for (let ti = 0, nTokens = tokens.length; ti < nTokens; ++ti) {
                const token = tokens[ti];
                let style = styleCache[token];
                let match = void 0;
                let isEmbedded;
                if (typeof style === "string") {
                    isEmbedded = false;
                } else {
                    let patternParts = shortcuts[token.charAt(0)];
                    if (patternParts) {
                        match = token.match(patternParts[1]);
                        style = patternParts[0];
                    } else {
                        for (let i = 0; i < nPatterns; ++i) {
                            patternParts = fallthroughStylePatterns[i];
                            match = token.match(patternParts[1]);
                            if (match) {
                                style = patternParts[0];
                                break;
                            }
                        }
                        if (!match) {
                            style = PR_PLAIN;
                        }
                    }
                    isEmbedded = style.length >= 5 && "lang-" === style.substring(0, 5);
                    if (isEmbedded && !(match && typeof match[1] === "string")) {
                        isEmbedded = false;
                        style = PR_SOURCE;
                    }
                    if (!isEmbedded) {
                        styleCache[token] = style;
                    }
                }
                const tokenStart = pos;
                pos += token.length;
                if (!isEmbedded) {
                    decorations.push(basePos + tokenStart, style);
                } else {
                    const embeddedSource = match[1];
                    let embeddedSourceStart = token.indexOf(embeddedSource);
                    let embeddedSourceEnd = embeddedSourceStart + embeddedSource.length;
                    if (match[2]) {
                        embeddedSourceEnd = token.length - match[2].length;
                        embeddedSourceStart = embeddedSourceEnd - embeddedSource.length;
                    }
                    const lang = style.substring(5);
                    appendDecorations(sourceNode, basePos + tokenStart, token.substring(0, embeddedSourceStart), decorate, decorations);
                    appendDecorations(sourceNode, basePos + tokenStart + embeddedSourceStart, embeddedSource, langHandlerForExtension(lang, embeddedSource), decorations);
                    appendDecorations(sourceNode, basePos + tokenStart + embeddedSourceEnd, token.substring(embeddedSourceEnd), decorate, decorations);
                }
            }
            job.decorations = decorations;
        };
        return decorate;
    }

    function sourceDecorator(options) {
        const shortcutStylePatterns = [],
            fallthroughStylePatterns = [];
        if (options.tripleQuotedStrings) {
            shortcutStylePatterns.push([PR_STRING, /^(?:'''(?:[^'\\]|\\[\s\S]|'{1,2}(?=[^']))*(?:'''|$)|"""(?:[^"\\]|\\[\s\S]|"{1,2}(?=[^"]))*(?:"""|$)|'(?:[^'\\]|\\[\s\S])*(?:'|$)|"(?:[^"\\]|\\[\s\S])*(?:"|$))/, null, "'\""]);
        } else if (options.multiLineStrings) {
            shortcutStylePatterns.push([PR_STRING, /^(?:'(?:[^'\\]|\\[\s\S])*(?:'|$)|"(?:[^"\\]|\\[\s\S])*(?:"|$)|`(?:[^`\\]|\\[\s\S])*(?:`|$))/, null, "'\"`"]);
        } else {
            shortcutStylePatterns.push([PR_STRING, /^(?:'(?:[^'\\\r\n]|\\.)*(?:'|$)|"(?:[^"\\\r\n]|\\.)*(?:"|$))/, null, "\"'"]);
        }
        if (options.verbatimStrings) {
            fallthroughStylePatterns.push([PR_STRING, /^@"(?:[^"]|"")*(?:"|$)/, null]);
        }
        const hc = options.hashComments;
        if (hc) {
            if (options.cStyleComments) {
                if (hc > 1) {
                    shortcutStylePatterns.push([PR_COMMENT, /^#(?:##(?:[^#]|#(?!##))*(?:###|$)|.*)/, null, "#"]);
                } else {
                    shortcutStylePatterns.push([PR_COMMENT, /^#(?:(?:define|e(?:l|nd)if|else|error|ifn?def|include|line|pragma|undef|warning)\b|[^\r\n]*)/, null, "#"]);
                }
                fallthroughStylePatterns.push([PR_STRING, /^<(?:(?:(?:\.\.\/)*|\/?)(?:[\w-]+(?:\/[\w-]+)+)?[\w-]+\.h(?:h|pp|\+\+)?|[a-z]\w*)>/, null]);
            } else {
                shortcutStylePatterns.push([PR_COMMENT, /^#[^\r\n]*/, null, "#"]);
            }
        }
        if (options.cStyleComments) {
            fallthroughStylePatterns.push([PR_COMMENT, /^\/\/[^\r\n]*/, null]);
            fallthroughStylePatterns.push([PR_COMMENT, /^\/\*[\s\S]*?(?:\*\/|$)/, null]);
        }
        const regexLiterals = options.regexLiterals;
        if (regexLiterals) {
            const regexExcls = regexLiterals > 1 ? "" : "\n\r";
            const regexAny = regexExcls ? "." : "[\\S\\s]";
            const REGEX_LITERAL = `/(?=[^/*${regexExcls}])` + `(?:[^/\\x5B\\x5C${regexExcls}]` + `|\\x5C${regexAny}|\\x5B(?:[^\\x5C\\x5D${regexExcls}]` + `|\\x5C${regexAny})*(?:\\x5D|$))+` + "/";
            fallthroughStylePatterns.push(["lang-regex", RegExp(`^${REGEXP_PRECEDER_PATTERN}(${REGEX_LITERAL})`)]);
        }
        const types = options.types;
        if (types) {
            fallthroughStylePatterns.push([PR_TYPE, types]);
        }
        const keywords = `${options.keywords}`.replace(/^ | $/g, "");
        if (keywords.length) {
            fallthroughStylePatterns.push([PR_KEYWORD, new RegExp(`^(?:${keywords.replace(/[\s,]+/g, "|")})\\b`), null]);
        }
        shortcutStylePatterns.push([PR_PLAIN, /^\s+/, null, " \r\n	 "]);
        let punctuation = "^.[^\\s\\w.$@'\"`/\\\\]*";
        if (options.regexLiterals) {
            punctuation += "(?!s*/)";
        }
        fallthroughStylePatterns.push([PR_LITERAL, /^@[a-z_$][a-z_$@0-9]*/i, null], [PR_TYPE, /^(?:[@_]?[A-Z]+[a-z][A-Za-z_$@0-9]*|\w+_t\b)/, null], [PR_PLAIN, /^[a-z_$][a-z_$@0-9]*/i, null], [PR_LITERAL, new RegExp("^(?:" + "0x[a-f0-9]+" + "|(?:\\d(?:_\\d+)*\\d*(?:\\.\\d*)?|\\.\\d\\+)" + "(?:e[+\\-]?\\d+)?" + ")" + "[a-z]*", "i"), null, "0123456789"], [PR_PLAIN, /^\\[\s\S]?/, null], [PR_PUNCTUATION, new RegExp(punctuation), null]);
        return createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns);
    }
    const decorateSource = sourceDecorator({
        keywords: ALL_KEYWORDS,
        hashComments: true,
        cStyleComments: true,
        multiLineStrings: true,
        regexLiterals: true,
    });

    function numberLines(node, startLineNum, isPreformatted) {
        const nocode = /(?:^|\s)nocode(?:\s|$)/;
        const lineBreak = /\r\n?|\n/;
        const document = node.ownerDocument;
        let li = document.createElement("li");
        while (node.firstChild) {
            li.appendChild(node.firstChild);
        }
        const listItems = [li];

        function walk(node) {
            const type = node.nodeType;
            if (type === 1 && !nocode.test(node.className)) {
                if ("br" === node.nodeName.toLowerCase()) {
                    breakAfter(node);
                    if (node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                } else {
                    for (let child = node.firstChild; child; child = child.nextSibling) {
                        walk(child);
                    }
                }
            } else if ((type === 3 || type === 4) && isPreformatted) {
                const text = node.nodeValue;
                const match = text.match(lineBreak);
                if (match) {
                    const firstLine = text.substring(0, match.index);
                    node.nodeValue = firstLine;
                    const tail = text.substring(match.index + match[0].length);
                    if (tail) {
                        const parent = node.parentNode;
                        parent.insertBefore(document.createTextNode(tail), node.nextSibling);
                    }
                    breakAfter(node);
                    if (!firstLine) {
                        node.parentNode.removeChild(node);
                    }
                }
            }
        }

        function breakAfter(_lineEndNode) {
            let lineEndNode = _lineEndNode;
            while (!lineEndNode.nextSibling) {
                lineEndNode = lineEndNode.parentNode;
                if (!lineEndNode) {
                    return;
                }
            }

            function breakLeftOf(limit, copy) {
                const rightSide = copy ? limit.cloneNode(false) : limit;
                const parent = limit.parentNode;
                if (parent) {
                    const parentClone = breakLeftOf(parent, 1);
                    let next = limit.nextSibling;
                    parentClone.appendChild(rightSide);
                    for (let sibling = next; sibling; sibling = next) {
                        next = sibling.nextSibling;
                        parentClone.appendChild(sibling);
                    }
                }
                return rightSide;
            }
            let copiedListItem = breakLeftOf(lineEndNode.nextSibling, 0);
            for (let parent;
                (parent = copiedListItem.parentNode) && parent.nodeType === 1;) {
                copiedListItem = parent;
            }
            listItems.push(copiedListItem);
        }
        for (let i = 0; i < listItems.length; ++i) {
            walk(listItems[i]);
        }
        if (startLineNum === (startLineNum | 0)) {
            listItems[0].setAttribute("value", startLineNum);
        }
        const ol = document.createElement("ol");
        ol.className = "linenums";
        const offset = Math.max(0, startLineNum - 1 | 0) || 0;
        for (let i = 0, n = listItems.length; i < n; ++i) {
            li = listItems[i];
            li.className = `L${(i + offset) % 10}`;
            li.id = `L${i + offset + 1}`;
            if (!li.firstChild) {
                li.appendChild(document.createTextNode(" "));
            }
            ol.appendChild(li);
        }
        node.appendChild(ol);
    }

    function recombineTagsAndDecorations(job) {
        let isIE8OrEarlier = /\bMSIE\s(\d+)/.exec(navigator.userAgent);
        isIE8OrEarlier = isIE8OrEarlier && +isIE8OrEarlier[1] <= 8;
        const newlineRe = /\n/g;
        const source = job.sourceCode;
        const sourceLength = source.length;
        let sourceIndex = 0;
        const spans = job.spans;
        const nSpans = spans.length;
        let spanIndex = 0;
        const decorations = job.decorations;
        let nDecorations = decorations.length;
        let decorationIndex = 0;
        decorations[nDecorations] = sourceLength;
        let decPos, i;
        for (i = decPos = 0; i < nDecorations;) {
            if (decorations[i] !== decorations[i + 2]) {
                decorations[decPos++] = decorations[i++];
                decorations[decPos++] = decorations[i++];
            } else {
                i += 2;
            }
        }
        nDecorations = decPos;
        for (i = decPos = 0; i < nDecorations;) {
            const startPos = decorations[i];
            const startDec = decorations[i + 1];
            let end = i + 2;
            while (end + 2 <= nDecorations && decorations[end + 1] === startDec) {
                end += 2;
            }
            decorations[decPos++] = startPos;
            decorations[decPos++] = startDec;
            i = end;
        }
        nDecorations = decorations.length = decPos;
        const sourceNode = job.sourceNode;
        let oldDisplay = "";
        if (sourceNode) {
            oldDisplay = sourceNode.style.display;
            sourceNode.style.display = "none";
        }
        try {
            while (spanIndex < nSpans) {
                const spanEnd = spans[spanIndex + 2] || sourceLength;
                const decEnd = decorations[decorationIndex + 2] || sourceLength;
                const end = Math.min(spanEnd, decEnd);
                let textNode = spans[spanIndex + 1];
                let styledText;
                if (textNode.nodeType !== 1 && (styledText = source.substring(sourceIndex, end))) {
                    if (isIE8OrEarlier) {
                        styledText = styledText.replace(newlineRe, "\r");
                    }
                    textNode.nodeValue = styledText;
                    const document = textNode.ownerDocument;
                    const span = document.createElement("span");
                    span.className = decorations[decorationIndex + 1];
                    const parentNode = textNode.parentNode;
                    parentNode.replaceChild(span, textNode);
                    span.appendChild(textNode);
                    if (sourceIndex < spanEnd) {
                        spans[spanIndex + 1] = textNode = document.createTextNode(source.substring(end, spanEnd));
                        parentNode.insertBefore(textNode, span.nextSibling);
                    }
                }
                sourceIndex = end;
                if (sourceIndex >= spanEnd) {
                    spanIndex += 2;
                }
                if (sourceIndex >= decEnd) {
                    decorationIndex += 2;
                }
            }
        } finally {
            if (sourceNode) {
                sourceNode.style.display = oldDisplay;
            }
        }
    }
    const langHandlerRegistry = {};

    function registerLangHandler(handler, fileExtensions) {
        for (let i = fileExtensions.length; --i >= 0;) {
            const ext = fileExtensions[i];
            if (!Object.prototype.hasOwnProperty.bind(langHandlerRegistry)(ext)) {
                langHandlerRegistry[ext] = handler;
            } else if (window.console) {
                console.warn("cannot override language handler %s", ext);
            }
        }
    }

    function langHandlerForExtension(_extension, source) {
        let extension = _extension;
        if (!(extension && Object.prototype.hasOwnProperty.bind(langHandlerRegistry)(extension))) {
            extension = /^\s*</.test(source) ? "default-markup" : "default-code";
        }
        return langHandlerRegistry[extension];
    }
    registerLangHandler(decorateSource, ["default-code"]);
    registerLangHandler(createSimpleLexer([], [
        [PR_PLAIN, /^[^<?]+/],
        [PR_DECLARATION, /^<!\w[^>]*(?:>|$)/],
        [PR_COMMENT, /^<!--[\s\S]*?(?:-->|$)/],
        ["lang-", /^<\?([\s\S]+?)(?:\?>|$)/],
        ["lang-", /^<%([\s\S]+?)(?:%>|$)/],
        [PR_PUNCTUATION, /^(?:<[%?]|[%?]>)/],
        ["lang-", /^<xmp\b[^>]*>([\s\S]+?)<\/xmp\b[^>]*>/i],
        ["lang-js", /^<script\b[^>]*>([\s\S]*?)(<\/script\b[^>]*>)/i],
        ["lang-css", /^<style\b[^>]*>([\s\S]*?)(<\/style\b[^>]*>)/i],
        ["lang-in.tag", /^(<\/?[a-z][^<>]*>)/i],
    ]), ["default-markup", "htm", "html", "mxml", "xhtml", "xml", "xsl"]);
    registerLangHandler(createSimpleLexer([
        [PR_PLAIN, /^[\s]+/, null, " 	\r\n"],
        [PR_ATTRIB_VALUE, /^(?:"[^"]*"?|'[^']*'?)/, null, "\"'"],
    ], [
        [PR_TAG, /^^<\/?[a-z](?:[\w.:-]*\w)?|\/?>$/i],
        [PR_ATTRIB_NAME, /^(?!style[\s=]|on)[a-z](?:[\w:-]*\w)?/i],
        ["lang-uq.val", /^=\s*([^>'"\s]*(?:[^>'"\s/]|\/(?=\s)))/],
        [PR_PUNCTUATION, /^[=<>/]+/],
        ["lang-js", /^on\w+\s*=\s*"([^"]+)"/i],
        ["lang-js", /^on\w+\s*=\s*'([^']+)'/i],
        ["lang-js", /^on\w+\s*=\s*([^"'>\s]+)/i],
        ["lang-css", /^style\s*=\s*"([^"]+)"/i],
        ["lang-css", /^style\s*=\s*'([^']+)'/i],
        ["lang-css", /^style\s*=\s*([^"'>\s]+)/i],
    ]), ["in.tag"]);
    registerLangHandler(createSimpleLexer([], [
        [PR_ATTRIB_VALUE, /^[\s\S]+/],
    ]), ["uq.val"]);
    registerLangHandler(sourceDecorator({
        keywords: CPP_KEYWORDS,
        hashComments: true,
        cStyleComments: true,
        types: C_TYPES,
    }), ["c", "cc", "cpp", "cxx", "cyc", "m"]);
    registerLangHandler(sourceDecorator({
        keywords: "null,true,false",
    }), ["json"]);
    registerLangHandler(sourceDecorator({
        keywords: CSHARP_KEYWORDS,
        hashComments: true,
        cStyleComments: true,
        verbatimStrings: true,
        types: C_TYPES,
    }), ["cs"]);
    registerLangHandler(sourceDecorator({
        keywords: JAVA_KEYWORDS,
        cStyleComments: true,
    }), ["java"]);
    registerLangHandler(sourceDecorator({
        keywords: SH_KEYWORDS,
        hashComments: true,
        multiLineStrings: true,
    }), ["bash", "bsh", "csh", "sh"]);
    registerLangHandler(sourceDecorator({
        keywords: PYTHON_KEYWORDS,
        hashComments: true,
        multiLineStrings: true,
        tripleQuotedStrings: true,
    }), ["cv", "py", "python"]);
    registerLangHandler(sourceDecorator({
        keywords: PERL_KEYWORDS,
        hashComments: true,
        multiLineStrings: true,
        regexLiterals: 2,
    }), ["perl", "pl", "pm"]);
    registerLangHandler(sourceDecorator({
        keywords: RUBY_KEYWORDS,
        hashComments: true,
        multiLineStrings: true,
        regexLiterals: true,
    }), ["rb", "ruby"]);
    registerLangHandler(sourceDecorator({
        keywords: JSCRIPT_KEYWORDS,
        cStyleComments: true,
        regexLiterals: true,
    }), ["javascript", "js", "ts", "typescript"]);
    registerLangHandler(sourceDecorator({
        keywords: COFFEE_KEYWORDS,
        hashComments: 3,
        cStyleComments: true,
        multilineStrings: true,
        tripleQuotedStrings: true,
        regexLiterals: true,
    }), ["coffee"]);
    registerLangHandler(createSimpleLexer([], [
        [PR_STRING, /^[\s\S]+/],
    ]), ["regex"]);

    function applyDecorator(job) {
        const opt_langExtension = job.langExtension;
        try {
            const sourceAndSpans = extractSourceSpans(job.sourceNode, job.pre);
            const source = sourceAndSpans.sourceCode;
            job.sourceCode = source;
            job.spans = sourceAndSpans.spans;
            job.basePos = 0;
            langHandlerForExtension(opt_langExtension, source)(job);
            recombineTagsAndDecorations(job);
        } catch (e) {
            if (window.console) {
                console.log(e && e.stack || e);
            }
        }
    }

    function $prettyPrintOne(sourceCodeHtml, opt_langExtension, opt_numberLines) {
        const nl = opt_numberLines || false;
        const langExtension = opt_langExtension || null;
        let container = document.createElement("div");
        container.innerHTML = `<pre>${sourceCodeHtml}</pre>`;
        container = container.firstChild;
        if (nl) {
            numberLines(container, nl, true);
        }
        const job = {
            langExtension: langExtension,
            numberLines: nl,
            sourceNode: container,
            pre: 1,
            sourceCode: null,
            basePos: null,
            spans: null,
            decorations: null,
        };
        applyDecorator(job);
        return container.innerHTML;
    }

    function $prettyPrint(opt_whenDone, opt_root) {
        const root = opt_root || document.body;
        const doc = root.ownerDocument || document;

        function byTagName(tn) {
            return root.getElementsByTagName(tn);
        }
        let codeSegments = [byTagName("pre"), byTagName("code"), byTagName("xmp")];
        const elements = [];
        for (let i = 0; i < codeSegments.length; ++i) {
            for (let j = 0, n = codeSegments[i].length; j < n; ++j) {
                elements.push(codeSegments[i][j]);
            }
        }
        codeSegments = null;
        let clock = Date;
        if (!clock.now) {
            clock = {
                now: function () {
                    return +new Date();
                },
            };
        }
        let k = 0;
        const langExtensionRe = /\blang(?:uage)?-([\w.]+)(?!\S)/;
        const prettyPrintRe = /\bprettyprint\b/;
        const prettyPrintedRe = /\bprettyprinted\b/;
        const preformattedTagNameRe = /pre|xmp/i;
        const codeRe = /^code$/i;
        const preCodeXmpRe = /^(?:pre|code|xmp)$/i;

        function doWork() {
            const endTime = window.PR_SHOULD_USE_CONTINUATION ? clock.now() + 250 : Infinity;
            for (; k < elements.length && clock.now() < endTime; k++) {
                const cs = elements[k];
                const attrs = {};
                let preceder = cs;
                while (Number.MAX_SAFE_INTEGER > Number.MIN_SAFE_INTEGER) {
                    const nt = preceder.nodeType;
                    const value = (nt === 7 || nt === 8) && preceder.nodeValue;
                    if (value ? !/^\??prettify\b/.test(value) : nt !== 3 || /\S/.test(preceder.nodeValue)) {
                        break;
                    }
                    if (value) {
                        value.replace(/\b(\w+)=([\w:.%+-]+)/g, (_, name, value) => {
                            attrs[name] = value;
                        });
                        break;
                    }
                    preceder = preceder.previousSibling;
                }
                const className = cs.className;
                if ((Object.keys(attrs).length > 0 || prettyPrintRe.test(className)) && !prettyPrintedRe.test(className)) {
                    let nested = false;
                    for (let p = cs.parentNode; p; p = p.parentNode) {
                        const tn = p.tagName;
                        if (preCodeXmpRe.test(tn) && p.className && prettyPrintRe.test(p.className)) {
                            nested = true;
                            break;
                        }
                    }
                    if (!nested) {
                        cs.classList.add("prettyprinted");
                        let langExtension = attrs.lang;
                        if (!langExtension) {
                            langExtension = className.match(langExtensionRe);
                            let wrapper;
                            if (!langExtension && (wrapper = childContentWrapper(cs)) && codeRe.test(wrapper.tagName)) {
                                langExtension = wrapper.className.match(langExtensionRe);
                            }
                            if (langExtension) {
                                langExtension = langExtension[1];
                            }
                        }
                        let preformatted;
                        if (preformattedTagNameRe.test(cs.tagName)) {
                            preformatted = 1;
                        } else {
                            const currentStyle = cs.currentStyle;
                            const defaultView = doc.defaultView;
                            const whitespace = currentStyle ? currentStyle.whiteSpace : defaultView && defaultView.getComputedStyle ? defaultView.getComputedStyle(cs, null).getPropertyValue("white-space") : 0;
                            preformatted = whitespace && "pre" === whitespace.substring(0, 3);
                        }
                        let lineNums = attrs.linenums;
                        if (!(lineNums = lineNums === "true" || +lineNums)) {
                            lineNums = className.match(/\blinenums\b(?::(\d+))?/);
                            lineNums = lineNums ? lineNums[1] && lineNums[1].length ? +lineNums[1] : true : false;
                        }
                        if (lineNums) {
                            numberLines(cs, lineNums, preformatted);
                        }
                        const prettyPrintingJob = {
                            langExtension: langExtension,
                            sourceNode: cs,
                            numberLines: lineNums,
                            pre: preformatted,
                            sourceCode: null,
                            basePos: null,
                            spans: null,
                            decorations: null,
                        };
                        applyDecorator(prettyPrintingJob);
                    }
                }
            }
            if (k < elements.length) {
                window.setTimeout(doWork, 250);
            } else if ("function" === typeof opt_whenDone) {
                opt_whenDone();
            }
        }
        doWork();
    }
    window.PR = {
        createSimpleLexer: createSimpleLexer,
        registerLangHandler: registerLangHandler,
        sourceDecorator: sourceDecorator,
        PR_ATTRIB_NAME: PR_ATTRIB_NAME,
        PR_ATTRIB_VALUE: PR_ATTRIB_VALUE,
        PR_COMMENT: PR_COMMENT,
        PR_DECLARATION: PR_DECLARATION,
        PR_KEYWORD: PR_KEYWORD,
        PR_LITERAL: PR_LITERAL,
        PR_NOCODE: PR_NOCODE,
        PR_PLAIN: PR_PLAIN,
        PR_PUNCTUATION: PR_PUNCTUATION,
        PR_SOURCE: PR_SOURCE,
        PR_STRING: PR_STRING,
        PR_TAG: PR_TAG,
        PR_TYPE: PR_TYPE,
        prettyPrintOne: window.prettyPrintOne = $prettyPrintOne,
        prettyPrint: window.prettyPrint = $prettyPrint,
    };

    /* https://github.com/google/code-prettify/blob/master/src/lang-css.js */
    registerLangHandler(createSimpleLexer([
        [PR_PLAIN, /^[ \t\r\n\f]+/, null, " 	\r\n\f"],
    ], [
        [PR_STRING, /^"(?:[^\n\r\f"\\]|\\(?:\r\n?|\n|\f)|\\[\s\S])*"/, null],
        [PR_STRING, /^'(?:[^\n\r\f'\\]|\\(?:\r\n?|\n|\f)|\\[\s\S])*'/, null],
        ["lang-css-str", /^url\(([^)"']+)\)/i],
        [PR_KEYWORD, /^(?:url|rgb|!important|@import|@page|@media|@charset|inherit)(?=[^\-\w]|$)/i, null],
        ["lang-css-kw", /^(-?(?:[_a-z]|(?:\\[0-9a-f]+ ?))(?:[_a-z0-9-]|\\(?:\\[0-9a-f]+ ?))*)\s*:/i],
        [PR_COMMENT, /^\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//],
        [PR_COMMENT, /^(?:<!--|-->)/],
        [PR_LITERAL, /^(?:\d+|\d*\.\d+)(?:%|[a-z]+)?/i],
        [PR_LITERAL, /^#(?:[0-9a-f]{3}){1,2}\b/i],
        [PR_PLAIN, /^-?(?:[_a-z]|(?:\\[\da-f]+ ?))(?:[_a-z\d-]|\\(?:\\[\da-f]+ ?))*/i],
        [PR_PUNCTUATION, /^[^\s\w'"]+/],
    ]), ["css"]);
    registerLangHandler(createSimpleLexer([], [
        [PR_KEYWORD, /^-?(?:[_a-z]|(?:\\[\da-f]+ ?))(?:[_a-z\d-]|\\(?:\\[\da-f]+ ?))*/i],
    ]), ["css-kw"]);
    registerLangHandler(createSimpleLexer([], [
        [PR_STRING, /^[^)"']+/],
    ]), ["css-str"]);

    /* https://github.com/google/code-prettify/blob/master/src/lang-lua.js */
    registerLangHandler(createSimpleLexer([
        [PR_PLAIN, /^[\t\n\r \xA0]+/, null, "\t\n\r \xA0"],
        [PR_STRING, /^(?:"(?:[^"\\]|\\[\s\S])*(?:"|$)|'(?:[^'\\]|\\[\s\S])*(?:'|$))/, null, '"\''],
    ], [
        [PR_COMMENT, /^--(?:\[(=*)\[[\s\S]*?(?:\]\1\]|$)|[^\r\n]*)/],
        [PR_STRING, /^\[(=*)\[[\s\S]*?(?:\]\1\]|$)/],
        [PR_KEYWORD, /^(?:and|break|do|else|elseif|end|false|for|function|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/, null],
        [PR_LITERAL,
            /^[+-]?(?:0x[\da-f]+|(?:(?:\.\d+|\d+(?:\.\d*)?)(?:e[+-]?\d+)?))/i,
        ],
        [PR_PLAIN, /^[a-z_]\w*/i],
        [PR_PUNCTUATION, /^[^\w\t\n\r \xA0][^\w\t\n\r \xA0"'\-+=]*/],
    ]), ["lua"]);

    /* https://github.com/googlearchive/code-prettify/blob/master/src/lang-tex.js */
    registerLangHandler(createSimpleLexer([
        [PR_PLAIN, /^[\t\n\r \xA0]+/, null, "\t\n\r \xA0"],
        [PR_COMMENT, /^%[^\r\n]*/, null, "%"],
    ], [
        [PR_KEYWORD, /^\\[a-zA-Z@]+/],
        [PR_KEYWORD, /^\\./],
        [PR_TYPE, /^[$&]/],
        [PR_LITERAL, /[+-]?(?:\.\d+|\d+(?:\.\d*)?)(cm|em|ex|in|pc|pt|bp|mm)/i],
        [PR_PUNCTUATION, /^[{}()[\]=]+/],
    ]), ["latex", "tex"]);

    /* https://github.com/googlearchive/code-prettify/blob/master/src/lang-wiki.js */
    registerLangHandler(createSimpleLexer([
        [PR_PLAIN, /^[\t\n\r \xA0]+/, null, "\t\n\r \xA0"],
        [PR_PUNCTUATION, /^[=*~^[\]]+/, null, "=*~^[]"],
    ], [
        ["lang-wiki.meta", /(?:^^|\r\n?|\n)(#[a-z]+)\b/],
        [PR_LITERAL, /^(?:[A-Z][a-z][a-z0-9]+[A-Z][a-z][a-zA-Z0-9]+)\b/],
        ["lang-", /^\{\{\{([\s\S]+?)\}\}\}/],
        ["lang-", /^`([^\r\n`]+)`/],
        [PR_STRING, /^https?:\/\/[^/?#\s]*(?:\/[^?#\s]*)?(?:\?[^#\s]*)?(?:#\S*)?/i],
        [PR_PLAIN, /^(?:\r\n|[\s\S])[^#=*~^A-Zh{`[\r\n]*/],
    ]), ["wiki"]);
    registerLangHandler(createSimpleLexer([
        [PR_KEYWORD, /^#[a-z]+/i, null, "#"],
    ], []), ["wiki.meta"]);
    $prettyPrint();
});
// </pre>