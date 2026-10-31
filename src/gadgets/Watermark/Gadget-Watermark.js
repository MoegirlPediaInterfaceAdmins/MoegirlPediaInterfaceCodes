/**
 * 本文件由 packages/Watermark 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 * 内嵌 watermark-js-plus（https://github.com/zhensherlock/watermark-js-plus，MIT License）
 */
"use strict";

// node_modules/watermark-js-plus/dist/es/node_modules/tslib/tslib.es6.js
var extendStatics = function(d, b) {
  return extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) Object.prototype.hasOwnProperty.call(b2, p) && (d2[p] = b2[p]);
  }, extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b != "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function() {
  return __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && (t[p] = s[p]);
    }
    return t;
  }, __assign.apply(this, arguments);
};
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator == "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g.throw = verb(1), g.return = verb(2), typeof Symbol == "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    for (; g && (g = 0, op[0] && (_ = 0)), _; ) try {
      if (f = 1, y && (t = op[0] & 2 ? y.return : op[0] ? y.throw || ((t = y.return) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      switch (y = 0, t && (op = [op[0] & 2, t.value]), op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          return _.label++, { value: op[1], done: !1 };
        case 5:
          _.label++, y = op[1], op = [0];
          continue;
        case 7:
          op = _.ops.pop(), _.trys.pop();
          continue;
        default:
          if (t = _.trys, !(t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1], t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2], _.ops.push(op);
            break;
          }
          t[2] && _.ops.pop(), _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e], y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: !0 };
  }
}

// node_modules/watermark-js-plus/dist/es/src/utils/index.js
var convertImage = function(canvas) {
  return canvas.toDataURL("image/png", 1);
}, isFunction = function(value) {
  return typeof value == "function";
}, isUndefined = function(value) {
  return value === void 0;
}, isString = function(value) {
  return typeof value == "string";
}, createSVGElement = function(tagName, attrs, namespaceURI) {
  attrs === void 0 && (attrs = {}), namespaceURI === void 0 && (namespaceURI = "http://www.w3.org/2000/svg");
  var element = document.createElementNS(namespaceURI, tagName);
  for (var attr in attrs)
    element.setAttribute(attr, attrs[attr]);
  return element;
}, getMultiLineData = function(ctx, text, maxWidth) {
  for (var result = [], str = "", word = "", i = 0, len = text.length; i < len; i++) {
    if (word = text.charAt(i), word === `
`) {
      result.push(str), str = "";
      continue;
    }
    str += word, ctx.measureText(str).width > maxWidth && (result.push(str.substring(0, str.length - 1)), str = "", i--);
  }
  return result.push(str), result;
}, createCustomContentSVG = function(ctx, options) {
  return __awaiter(void 0, void 0, void 0, function() {
    var svgElement, bodyElement, rect, rectWidth, rectHeight, width, height, foreignObjectElement, _a;
    return __generator(this, function(_b) {
      switch (_b.label) {
        case 0:
          return svgElement = createSVGElement("svg", {
            xmlns: "http://www.w3.org/2000/svg"
          }), bodyElement = document.createElement("div"), bodyElement.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"), bodyElement.style.cssText = `
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font: `.concat(ctx.font, `;
  color: `).concat(options.fontColor, `;
`), bodyElement.innerHTML = "<div class='rich-text-content'>".concat(options.content, "</div>"), document.body.appendChild(bodyElement), [4, convertImgToBase64(bodyElement)];
        case 1:
          return _b.sent(), rect = (_a = bodyElement.querySelector(".rich-text-content")) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect(), rectWidth = rect?.width, rectHeight = rect?.height, document.body.removeChild(bodyElement), width = options.richTextWidth || rectWidth || options.width, height = options.richTextHeight || rectHeight || options.height, svgElement.setAttribute("width", width.toString()), svgElement.setAttribute("height", height.toString()), foreignObjectElement = createSVGElement("foreignObject", {
            width: width.toString(),
            height: height.toString()
          }), foreignObjectElement.appendChild(bodyElement), svgElement.appendChild(foreignObjectElement), [2, {
            element: svgElement,
            width,
            height
          }];
      }
    });
  });
};
function convertImgToBase64(bodyElement) {
  return __awaiter(this, void 0, void 0, function() {
    var imgElements, _loop_1, _i, _a, img;
    return __generator(this, function(_b) {
      switch (_b.label) {
        case 0:
          imgElements = bodyElement.querySelectorAll("img"), _loop_1 = function(img2) {
            var src, response, blob_1, imgData, error_1;
            return __generator(this, function(_c) {
              switch (_c.label) {
                case 0:
                  if (src = img2.getAttribute("src"), !src) return [3, 6];
                  _c.label = 1;
                case 1:
                  return _c.trys.push([1, 5, , 6]), [4, fetch(src)];
                case 2:
                  return response = _c.sent(), [4, response.blob()];
                case 3:
                  return blob_1 = _c.sent(), [4, new Promise(function(resolve, reject) {
                    var reader = new FileReader();
                    reader.onloadend = function() {
                      return resolve(reader.result);
                    }, reader.onerror = reject, reader.readAsDataURL(blob_1);
                  })];
                case 4:
                  return imgData = _c.sent(), isString(imgData) && img2.setAttribute("src", imgData), [3, 6];
                case 5:
                  return error_1 = _c.sent(), console.error("Error converting ".concat(src, " to base64:"), error_1), [3, 6];
                case 6:
                  return [
                    2
                    /*return*/
                  ];
              }
            });
          }, _i = 0, _a = Array.from(imgElements), _b.label = 1;
        case 1:
          return _i < _a.length ? (img = _a[_i], [5, _loop_1(img)]) : [3, 4];
        case 2:
          _b.sent(), _b.label = 3;
        case 3:
          return _i++, [3, 1];
        case 4:
          return [
            2
            /*return*/
          ];
      }
    });
  });
}
var convertSVGToImage = function(svg) {
  var richContent = svg.outerHTML.replace(/<(img|br|input|hr|embed)(.*?)>/g, "<$1$2/>").replace(/\n/g, "").replace(/\t/g, "").replace(/#/g, "%23");
  return "data:image/svg+xml;charset=utf-8,".concat(richContent);
}, getValue = function(v1, v2) {
  return isUndefined(v1) ? v2 : v1;
}, loadImage = function(url, width, height) {
  width === void 0 && (width = void 0), height === void 0 && (height = void 0);
  var image = new Image();
  return image.setAttribute("crossOrigin", "anonymous"), !isUndefined(width) && (image.width = width), !isUndefined(height) && (image.height = height), image.src = url, new Promise(function(resolve) {
    image.onload = function() {
      resolve(image);
    };
  });
}, generateMatrix = function(rows, columns, value) {
  return Array.from({ length: rows }, function() {
    return new Array(columns).fill(value);
  });
}, generateAnimationStyle = function(movable, backgroundRepeat) {
  if (!movable)
    return "";
  var horizontalDuration = Math.random() * 6 + 2, verticalDuration = Math.random() * 2 + 2;
  switch (backgroundRepeat) {
    case "repeat":
      return "animation: 200s linear 0s infinite alternate watermark !important;";
    case "repeat-x":
      return "animation: ".concat(horizontalDuration, "s linear 0s infinite alternate watermark-vertical !important;'");
    case "repeat-y":
      return "animation: ".concat(verticalDuration, "s linear 0s infinite alternate watermark-horizontal !important;'");
    case "no-repeat":
      return "animation: ".concat(horizontalDuration, "s linear 0s infinite alternate watermark-horizontal, ").concat(verticalDuration, "s linear 0s infinite alternate watermark-vertical !important;");
    default:
      return "";
  }
};

// node_modules/watermark-js-plus/dist/es/src/utils/initialization.js
var initialOptions = {
  width: 300,
  height: 300,
  rotate: 45,
  layout: "default",
  auxiliaryLine: !1,
  translatePlacement: "middle",
  contentType: "text",
  content: "hello watermark-js-plus",
  textType: "fill",
  imageWidth: 0,
  imageHeight: 0,
  lineHeight: 30,
  zIndex: 2147483647,
  backgroundPosition: "0 0",
  backgroundRepeat: "repeat",
  fontSize: "20px",
  fontFamily: "sans-serif",
  fontStyle: "",
  fontVariant: "",
  fontColor: "#000",
  fontWeight: "normal",
  filter: "none",
  letterSpacing: "0px",
  wordSpacing: "0px",
  globalAlpha: 0.5,
  mode: "default",
  mutationObserve: !0,
  monitorProtection: !1,
  movable: !1,
  parent: "body",
  onSuccess: function() {
  },
  onBeforeDestroy: function() {
  },
  onDestroyed: function() {
  },
  onObserveError: function() {
  }
}, generateRecommendOptions = function(canvas, options, args) {
  var ctx = canvas.getContext("2d");
  if (ctx === null)
    throw new Error("get context error");
  ctx.font = "".concat(options.fontStyle, " ").concat(options.fontVariant, " ").concat(options.fontWeight, " ").concat(options.fontSize, " ").concat(options.fontFamily), ctx.filter = options.filter, ctx.letterSpacing = options.letterSpacing, ctx.wordSpacing = options.wordSpacing, options?.rotate && (options.rotate = (360 - options.rotate % 360) * (Math.PI / 180)), isUndefined(args.textRowMaxWidth) && (options.textRowMaxWidth = options.width);
  var result = {
    image: {
      rect: {
        width: options.imageWidth,
        height: options.imageHeight
      },
      position: {
        x: 0,
        y: 0
      }
    },
    textLine: {
      data: [],
      yOffsetValue: 0
    },
    advancedStyleParams: {
      linear: {
        x0: 0,
        x1: 0
      },
      radial: {
        x0: 0,
        y0: 0,
        r0: 0,
        x1: 0,
        y1: 0,
        r1: 0
      },
      conic: {
        x: 0,
        y: 0,
        startAngle: 0
      },
      pattern: {}
    }
  };
  switch (options.contentType) {
    case "text":
      result.textLine.data = [options.content];
      break;
    case "multi-line-text":
      result.textLine.data = getMultiLineData(ctx, options.content, options.textRowMaxWidth);
      break;
  }
  var translateX = options.width / 2, translateY = options.height / 2, textBaseline = "middle", textAlign = "center";
  switch (!isUndefined(args?.translateX) && !isUndefined(args?.translateY) ? (translateX = args?.translateX, translateY = args?.translateY, textBaseline = "top", textAlign = "left") : (result.advancedStyleParams.linear.x0 = -options.width / 2, result.advancedStyleParams.linear.x1 = options.width / 2, result.advancedStyleParams.radial.r0 = 0, result.advancedStyleParams.radial.r1 = options.width / 2), args.translatePlacement) {
    case "top":
      translateX = options.width / 2, translateY = 0, textBaseline = "top", result.advancedStyleParams.linear.x0 = -options.width / 2, result.advancedStyleParams.linear.x1 = options.width / 2, result.advancedStyleParams.radial.y0 = result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.radial.y1 = result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.conic.y = result.textLine.data.length * options.lineHeight / 2;
      break;
    case "top-start":
      translateX = 0, translateY = 0, textBaseline = "top", textAlign = "start", result.advancedStyleParams.linear.x0 = 0, result.advancedStyleParams.linear.x1 = options.width, result.advancedStyleParams.radial.x0 = options.width / 2, result.advancedStyleParams.radial.y0 = result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.radial.x1 = options.width / 2, result.advancedStyleParams.radial.y1 = result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.conic.x = options.width / 2, result.advancedStyleParams.conic.y = result.textLine.data.length * options.lineHeight / 2;
      break;
    case "top-end":
      translateX = options.width, translateY = 0, textBaseline = "top", textAlign = "end", result.advancedStyleParams.linear.x0 = 0, result.advancedStyleParams.linear.x1 = -options.width, result.advancedStyleParams.radial.x0 = -options.width / 2, result.advancedStyleParams.radial.y0 = result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.radial.x1 = -options.width / 2, result.advancedStyleParams.radial.y1 = result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.conic.x = -options.width / 2, result.advancedStyleParams.conic.y = result.textLine.data.length * options.lineHeight / 2;
      break;
    case "bottom":
      translateX = options.width / 2, translateY = options.height, textBaseline = "bottom", result.advancedStyleParams.linear.x0 = -options.width / 2, result.advancedStyleParams.linear.x1 = options.width / 2, result.advancedStyleParams.radial.y0 = -result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.radial.y1 = -result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.conic.x = 0, result.advancedStyleParams.conic.y = -result.textLine.data.length * options.lineHeight / 2;
      break;
    case "bottom-start":
      translateX = 0, translateY = options.height, textBaseline = "bottom", textAlign = "start", result.advancedStyleParams.linear.x0 = 0, result.advancedStyleParams.linear.x1 = options.width, result.advancedStyleParams.radial.x0 = options.width / 2, result.advancedStyleParams.radial.y0 = -result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.radial.x1 = options.width / 2, result.advancedStyleParams.radial.y1 = -result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.conic.x = options.width / 2, result.advancedStyleParams.conic.y = -result.textLine.data.length * options.lineHeight / 2;
      break;
    case "bottom-end":
      translateX = options.width, translateY = options.height, textBaseline = "bottom", textAlign = "end", result.advancedStyleParams.linear.x0 = 0, result.advancedStyleParams.linear.x1 = -options.width, result.advancedStyleParams.radial.x0 = -options.width / 2, result.advancedStyleParams.radial.y0 = -result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.radial.x1 = -options.width / 2, result.advancedStyleParams.radial.y1 = -result.textLine.data.length * options.lineHeight / 2, result.advancedStyleParams.conic.x = -options.width / 2, result.advancedStyleParams.conic.y = -result.textLine.data.length * options.lineHeight / 2;
      break;
    case "left":
      translateX = 0, translateY = options.height / 2, textAlign = "start", result.advancedStyleParams.linear.x0 = 0, result.advancedStyleParams.linear.x1 = options.width, result.advancedStyleParams.radial.x0 = options.width / 2, result.advancedStyleParams.radial.x1 = options.width / 2, result.advancedStyleParams.conic.x = options.width / 2, result.advancedStyleParams.conic.y = 0;
      break;
    case "right":
      translateX = options.width, translateY = options.height / 2, textAlign = "end", result.advancedStyleParams.linear.x0 = 0, result.advancedStyleParams.linear.x1 = -options.width, result.advancedStyleParams.radial.x0 = -options.width / 2, result.advancedStyleParams.radial.x1 = -options.width / 2, result.advancedStyleParams.conic.x = -options.width / 2, result.advancedStyleParams.conic.y = 0;
      break;
  }
  if (options.translateX = translateX, options.translateY = translateY, isUndefined(args?.textBaseline) && (options.textBaseline = textBaseline), isUndefined(args?.textAlign) && (options.textAlign = textAlign), ["text", "multi-line-text"].includes(options.contentType))
    switch (options.textBaseline) {
      case "middle":
        result.textLine.yOffsetValue = (result.textLine.data.length - 1) * options.lineHeight / 2;
        break;
      case "bottom":
      case "alphabetic":
      case "ideographic":
        result.textLine.yOffsetValue = (result.textLine.data.length - 1) * options.lineHeight + (options.lineHeight - parseInt(options.fontSize)) / 2;
        break;
      case "top":
      case "hanging":
        result.textLine.yOffsetValue = -options.lineHeight / 2 + parseInt(options.fontSize) / 2;
        break;
    }
  return result;
};

// node_modules/watermark-js-plus/dist/es/src/utils/protection.js
var protection = (function(need) {
  typeof window > "u" || need && Object.defineProperty(window, "MutationObserver", {
    writable: !1,
    configurable: !1
  });
});

// node_modules/watermark-js-plus/dist/es/src/core/canvas.js
var WatermarkCanvas = (
  /** @class */
  (function() {
    function WatermarkCanvas2(args, options) {
      this.props = args, this.options = options, this.canvas = WatermarkCanvas2.createCanvas(this.options.width, this.options.height), this.recommendOptions = generateRecommendOptions(this.canvas, this.options, this.props);
    }
    return WatermarkCanvas2.createCanvas = function(width, height) {
      var _a, ratio = window.devicePixelRatio || 1, canvas = document.createElement("canvas");
      return canvas.width = width * ratio, canvas.height = height * ratio, canvas.style.width = "".concat(width, "px"), canvas.style.height = "".concat(height, "px"), (_a = canvas.getContext("2d")) === null || _a === void 0 || _a.setTransform(ratio, 0, 0, ratio, 0, 0), canvas;
    }, WatermarkCanvas2.clearCanvas = function(canvas) {
      var ctx = canvas.getContext("2d");
      if (ctx === null)
        throw new Error("get context error");
      ctx.restore(), ctx.resetTransform(), ctx.clearRect(0, 0, canvas.width, canvas.height);
      var ratio = window.devicePixelRatio || 1;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }, WatermarkCanvas2.prototype.getCanvas = function() {
      return this.canvas;
    }, WatermarkCanvas2.prototype.clear = function() {
      WatermarkCanvas2.clearCanvas(this.canvas);
    }, WatermarkCanvas2.prototype.draw = function() {
      var _this = this, ctx = this.canvas.getContext("2d");
      if (ctx === null)
        throw new Error("get context error");
      return this.options.auxiliaryLine && (ctx.beginPath(), ctx.rect(0, 0, this.options.width, this.options.height), ctx.lineWidth = 1, ctx.strokeStyle = "#000", ctx.stroke(), ctx.closePath(), ctx.beginPath(), ctx.rect(this.options.translateX, this.options.translateY, 1, 1), ctx.lineWidth = 1, ctx.strokeStyle = "#f00", ctx.stroke(), ctx.closePath()), this.setStyle(ctx), ctx.save(), ctx.translate(this.options.translateX, this.options.translateY), ctx.rotate(this.options.rotate), new Promise(function(resolve) {
        switch (_this.options.contentType) {
          case "text":
            _this.drawText(ctx, resolve);
            break;
          case "image":
            _this.drawImage(ctx, resolve);
            break;
          case "multi-line-text":
            _this.drawMultiLineText(ctx, resolve);
            break;
          case "rich-text":
            _this.drawRichText(ctx, resolve);
            break;
        }
      });
    }, WatermarkCanvas2.prototype.setStyle = function(ctx) {
      var _a, propName = "fillStyle";
      this.options.textType === "stroke" && (propName = "strokeStyle");
      var style = this.options.fontColor;
      if (!((_a = this.options) === null || _a === void 0) && _a.advancedStyle)
        switch (this.options.advancedStyle.type) {
          case "linear":
            style = this.createLinearGradient(ctx);
            break;
          case "radial":
            style = this.createRadialGradient(ctx);
            break;
          case "conic":
            style = this.createConicGradient(ctx);
            break;
          case "pattern":
            style = this.createPattern(ctx);
            break;
        }
      ctx[propName] && style && (ctx[propName] = style), this.options.textAlign && (ctx.textAlign = this.options.textAlign), this.options.textBaseline && (ctx.textBaseline = this.options.textBaseline), ctx.globalAlpha = this.options.globalAlpha, this.options.shadowStyle && (ctx.shadowBlur = getValue(this.options.shadowStyle.shadowBlur, 0), ctx.shadowColor = getValue(this.options.shadowStyle.shadowColor, "#00000000"), ctx.shadowOffsetX = getValue(this.options.shadowStyle.shadowOffsetX, 0), ctx.shadowOffsetY = getValue(this.options.shadowStyle.shadowOffsetY, 0)), isFunction(this.options.extraDrawFunc) && this.options.extraDrawFunc(ctx);
    }, WatermarkCanvas2.prototype.createLinearGradient = function(ctx) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, gradient = ctx.createLinearGradient(getValue((_c = (_b = (_a = this.options.advancedStyle) === null || _a === void 0 ? void 0 : _a.params) === null || _b === void 0 ? void 0 : _b.linear) === null || _c === void 0 ? void 0 : _c.x0, this.recommendOptions.advancedStyleParams.linear.x0), getValue((_f = (_e = (_d = this.options.advancedStyle) === null || _d === void 0 ? void 0 : _d.params) === null || _e === void 0 ? void 0 : _e.linear) === null || _f === void 0 ? void 0 : _f.y0, 0), getValue((_j = (_h = (_g = this.options.advancedStyle) === null || _g === void 0 ? void 0 : _g.params) === null || _h === void 0 ? void 0 : _h.linear) === null || _j === void 0 ? void 0 : _j.x1, this.recommendOptions.advancedStyleParams.linear.x1), getValue((_m = (_l = (_k = this.options.advancedStyle) === null || _k === void 0 ? void 0 : _k.params) === null || _l === void 0 ? void 0 : _l.linear) === null || _m === void 0 ? void 0 : _m.y1, 0));
      return (_q = (_p = (_o = this.options) === null || _o === void 0 ? void 0 : _o.advancedStyle) === null || _p === void 0 ? void 0 : _p.colorStops) === null || _q === void 0 || _q.forEach(function(item) {
        gradient.addColorStop(item.offset, item.color);
      }), gradient;
    }, WatermarkCanvas2.prototype.createConicGradient = function(ctx) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, gradient = ctx.createConicGradient(getValue((_d = (_c = (_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.advancedStyle) === null || _b === void 0 ? void 0 : _b.params) === null || _c === void 0 ? void 0 : _c.conic) === null || _d === void 0 ? void 0 : _d.startAngle, 0), getValue((_h = (_g = (_f = (_e = this.options) === null || _e === void 0 ? void 0 : _e.advancedStyle) === null || _f === void 0 ? void 0 : _f.params) === null || _g === void 0 ? void 0 : _g.conic) === null || _h === void 0 ? void 0 : _h.x, this.recommendOptions.advancedStyleParams.conic.x), getValue((_m = (_l = (_k = (_j = this.options) === null || _j === void 0 ? void 0 : _j.advancedStyle) === null || _k === void 0 ? void 0 : _k.params) === null || _l === void 0 ? void 0 : _l.conic) === null || _m === void 0 ? void 0 : _m.y, this.recommendOptions.advancedStyleParams.conic.y));
      return (_q = (_p = (_o = this.options) === null || _o === void 0 ? void 0 : _o.advancedStyle) === null || _p === void 0 ? void 0 : _p.colorStops) === null || _q === void 0 || _q.forEach(function(item) {
        gradient.addColorStop(item.offset, item.color);
      }), gradient;
    }, WatermarkCanvas2.prototype.createRadialGradient = function(ctx) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, gradient = ctx.createRadialGradient(getValue((_d = (_c = (_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.advancedStyle) === null || _b === void 0 ? void 0 : _b.params) === null || _c === void 0 ? void 0 : _c.radial) === null || _d === void 0 ? void 0 : _d.x0, this.recommendOptions.advancedStyleParams.radial.x0), getValue((_h = (_g = (_f = (_e = this.options) === null || _e === void 0 ? void 0 : _e.advancedStyle) === null || _f === void 0 ? void 0 : _f.params) === null || _g === void 0 ? void 0 : _g.radial) === null || _h === void 0 ? void 0 : _h.y0, this.recommendOptions.advancedStyleParams.radial.y0), getValue((_m = (_l = (_k = (_j = this.options) === null || _j === void 0 ? void 0 : _j.advancedStyle) === null || _k === void 0 ? void 0 : _k.params) === null || _l === void 0 ? void 0 : _l.radial) === null || _m === void 0 ? void 0 : _m.r0, this.recommendOptions.advancedStyleParams.radial.r0), getValue((_r = (_q = (_p = (_o = this.options) === null || _o === void 0 ? void 0 : _o.advancedStyle) === null || _p === void 0 ? void 0 : _p.params) === null || _q === void 0 ? void 0 : _q.radial) === null || _r === void 0 ? void 0 : _r.x1, this.recommendOptions.advancedStyleParams.radial.x1), getValue((_v = (_u = (_t = (_s = this.options) === null || _s === void 0 ? void 0 : _s.advancedStyle) === null || _t === void 0 ? void 0 : _t.params) === null || _u === void 0 ? void 0 : _u.radial) === null || _v === void 0 ? void 0 : _v.y1, this.recommendOptions.advancedStyleParams.radial.y1), getValue((_z = (_y = (_x = (_w = this.options) === null || _w === void 0 ? void 0 : _w.advancedStyle) === null || _x === void 0 ? void 0 : _x.params) === null || _y === void 0 ? void 0 : _y.radial) === null || _z === void 0 ? void 0 : _z.r1, this.recommendOptions.advancedStyleParams.radial.r1));
      return (_2 = (_1 = (_0 = this.options) === null || _0 === void 0 ? void 0 : _0.advancedStyle) === null || _1 === void 0 ? void 0 : _1.colorStops) === null || _2 === void 0 || _2.forEach(function(item) {
        gradient.addColorStop(item.offset, item.color);
      }), gradient;
    }, WatermarkCanvas2.prototype.createPattern = function(ctx) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      return ctx.createPattern((_d = (_c = (_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.advancedStyle) === null || _b === void 0 ? void 0 : _b.params) === null || _c === void 0 ? void 0 : _c.pattern) === null || _d === void 0 ? void 0 : _d.image, ((_h = (_g = (_f = (_e = this.options) === null || _e === void 0 ? void 0 : _e.advancedStyle) === null || _f === void 0 ? void 0 : _f.params) === null || _g === void 0 ? void 0 : _g.pattern) === null || _h === void 0 ? void 0 : _h.repetition) || "");
    }, WatermarkCanvas2.prototype.setText = function(ctx, params) {
      var methodName = "fillText";
      this.options.textType === "stroke" && (methodName = "strokeText"), ctx[methodName] && ctx[methodName](params.text, params.x, params.y, params.maxWidth);
    }, WatermarkCanvas2.prototype.drawText = function(ctx, resolve) {
      this.setText(ctx, {
        text: this.options.content,
        x: 0,
        y: 0 - this.recommendOptions.textLine.yOffsetValue,
        maxWidth: this.options.textRowMaxWidth || this.options.width
      }), resolve(ctx.canvas);
    }, WatermarkCanvas2.prototype.drawImage = function(ctx, resolve) {
      var _this = this;
      loadImage(this.options.image).then(function(image) {
        var _a = _this.getImageRect(image), imageWidth = _a.width, imageHeight = _a.height, imagePosition = _this.getDrawImagePosition(imageWidth, imageHeight);
        ctx.drawImage(image, imagePosition.x, imagePosition.y, imageWidth, imageHeight), resolve(ctx.canvas);
      });
    }, WatermarkCanvas2.prototype.drawMultiLineText = function(ctx, resolve) {
      var _this = this, lines = this.recommendOptions.textLine.data, yOffsetValue = this.recommendOptions.textLine.yOffsetValue;
      lines.forEach(function(text, index) {
        _this.setText(ctx, {
          text,
          x: 0,
          y: _this.options.lineHeight * index - yOffsetValue,
          maxWidth: _this.options.textRowMaxWidth || _this.options.width
        });
      }), resolve(ctx.canvas);
    }, WatermarkCanvas2.prototype.drawRichText = function(ctx, resolve) {
      return __awaiter(this, void 0, void 0, function() {
        var obj, _this = this;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              return [4, createCustomContentSVG(ctx, this.options)];
            case 1:
              return obj = _a.sent(), loadImage(convertSVGToImage(obj.element), obj.width, obj.height).then(function(image) {
                var imagePosition = _this.getDrawImagePosition(image.width, image.height);
                ctx.drawImage(image, imagePosition.x, imagePosition.y, image.width, image.height), resolve(ctx.canvas);
              }), [
                2
                /*return*/
              ];
          }
        });
      });
    }, WatermarkCanvas2.prototype.getImageRect = function(image) {
      var rect = { width: this.options.imageWidth || 0, height: this.options.imageHeight || 0 };
      switch (!0) {
        case (rect.width !== 0 && rect.height === 0):
          rect.height = rect.width * image.height / image.width;
          break;
        case (rect.width === 0 && rect.height !== 0):
          rect.width = rect.height * image.width / image.height;
          break;
        case (rect.width === 0 && rect.height === 0):
          rect.width = image.width, rect.height = image.height;
          break;
      }
      return rect;
    }, WatermarkCanvas2.prototype.getDrawImagePosition = function(imageWidth, imageHeight) {
      var _a, _b, result = {
        x: -imageWidth / 2,
        y: -imageHeight / 2
      };
      switch (this.options.translatePlacement) {
        case "top":
          result.x = -imageWidth / 2, result.y = 0;
          break;
        case "top-start":
          result.x = 0, result.y = 0;
          break;
        case "top-end":
          result.x = -imageWidth, result.y = 0;
          break;
        case "bottom":
          result.x = -imageWidth / 2, result.y = -imageHeight;
          break;
        case "bottom-start":
          result.x = 0, result.y = -imageHeight;
          break;
        case "bottom-end":
          result.x = -imageWidth, result.y = -imageHeight;
          break;
        case "left":
          result.x = 0, result.y = -imageHeight / 2;
          break;
        case "right":
          result.x = -imageWidth, result.y = -imageHeight / 2;
          break;
      }
      return !isUndefined((_a = this.props) === null || _a === void 0 ? void 0 : _a.translateX) && (result.x = 0), !isUndefined((_b = this.props) === null || _b === void 0 ? void 0 : _b.translateY) && (result.y = 0), result;
    }, WatermarkCanvas2;
  })()
);

// node_modules/watermark-js-plus/dist/es/src/core/layout/grid.js
var GridLayout = (
  /** @class */
  (function() {
    function GridLayout2(args, partialCanvas) {
      var _a, _b, _c, _d;
      this.options = args, this.partialWidth = this.options.width, this.partialHeight = this.options.height, this.rows = ((_a = this.options.gridLayoutOptions) === null || _a === void 0 ? void 0 : _a.rows) || 1, this.cols = ((_b = this.options.gridLayoutOptions) === null || _b === void 0 ? void 0 : _b.cols) || 1, this.matrix = ((_c = this.options.gridLayoutOptions) === null || _c === void 0 ? void 0 : _c.matrix) || generateMatrix(this.rows, this.cols, 1), this.gap = ((_d = this.options.gridLayoutOptions) === null || _d === void 0 ? void 0 : _d.gap) || [0, 0], this.partialCanvas = partialCanvas;
    }
    return GridLayout2.prototype.draw = function() {
      var _a, _b, _c, _d, _e, _f, _g, _h, layoutCanvas = WatermarkCanvas.createCanvas(((_a = this.options.gridLayoutOptions) === null || _a === void 0 ? void 0 : _a.width) || this.partialWidth * this.cols + this.gap[0] * this.cols, ((_b = this.options.gridLayoutOptions) === null || _b === void 0 ? void 0 : _b.height) || this.partialHeight * this.rows + this.gap[1] * this.rows), layoutContext = layoutCanvas.getContext("2d");
      !((_c = this.options.gridLayoutOptions) === null || _c === void 0) && _c.backgroundImage && layoutContext?.drawImage((_d = this.options.gridLayoutOptions) === null || _d === void 0 ? void 0 : _d.backgroundImage, 0, 0, (_e = this.options.gridLayoutOptions) === null || _e === void 0 ? void 0 : _e.width, (_f = this.options.gridLayoutOptions) === null || _f === void 0 ? void 0 : _f.height);
      for (var rowIndex = 0; rowIndex < this.rows; rowIndex++)
        for (var colIndex = 0; colIndex < this.cols; colIndex++)
          !((_h = (_g = this.matrix) === null || _g === void 0 ? void 0 : _g[rowIndex]) === null || _h === void 0) && _h[colIndex] && layoutContext?.drawImage(this.partialCanvas, this.partialWidth * colIndex + this.gap[0] * colIndex, this.partialHeight * rowIndex + this.gap[1] * rowIndex, this.partialWidth, this.partialHeight);
      return layoutCanvas;
    }, GridLayout2;
  })()
);

// node_modules/watermark-js-plus/dist/es/src/core/layout/index.js
var renderLayout = function(options, partialCanvas) {
  return options.layout === "grid" ? new GridLayout(options, partialCanvas).draw() : partialCanvas;
}, generateBackgroundSize = function(options) {
  var _a, _b, _c;
  if (options.layout === "grid") {
    var cols = ((_a = options.gridLayoutOptions) === null || _a === void 0 ? void 0 : _a.cols) || 1, rows = ((_b = options.gridLayoutOptions) === null || _b === void 0 ? void 0 : _b.rows) || 1, gap = ((_c = options.gridLayoutOptions) === null || _c === void 0 ? void 0 : _c.gap) || [0, 0];
    return [options.width * cols + gap[0] * cols, options.height * rows + gap[1] * rows];
  } else
    return [options.width, options.height];
};

// node_modules/watermark-js-plus/dist/es/src/core/watermark.js
var Watermark = (
  /** @class */
  (function() {
    function Watermark2(args) {
      args === void 0 && (args = {}), this.parentElement = document.body, this.isCreating = !1, this.props = args, this.options = __assign(__assign({}, initialOptions), args), this.changeParentElement(this.options.parent), this.watermarkCanvas = new WatermarkCanvas(this.props, this.options), protection(this.options.monitorProtection);
    }
    return Watermark2.prototype.changeOptions = function() {
      return __awaiter(this, arguments, void 0, function(args, mode, redraw) {
        return args === void 0 && (args = {}), mode === void 0 && (mode = "overwrite"), redraw === void 0 && (redraw = !0), __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              return this.initConfigData(args, mode), protection(this.options.monitorProtection), redraw ? (this.remove(), [4, this.create()]) : [3, 2];
            case 1:
              _a.sent(), _a.label = 2;
            case 2:
              return [
                2
                /*return*/
              ];
          }
        });
      });
    }, Watermark2.prototype.create = function() {
      return __awaiter(this, void 0, void 0, function() {
        var firstDraw, image, watermarkInnerDom, parentElementType, backgroundSize, _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function(_h) {
          switch (_h.label) {
            case 0:
              if (this.isCreating)
                return [
                  2
                  /*return*/
                ];
              this.isCreating = !0, _h.label = 1;
            case 1:
              return _h.trys.push([1, , 3, 4]), this.validateUnique() ? this.validateContent() ? (firstDraw = isUndefined(this.watermarkDom), [4, (_a = this.watermarkCanvas) === null || _a === void 0 ? void 0 : _a.draw()]) : [
                2
                /*return*/
              ] : [
                2
                /*return*/
              ];
            case 2:
              if (_h.sent(), this.layoutCanvas = renderLayout(this.options, (_b = this.watermarkCanvas) === null || _b === void 0 ? void 0 : _b.getCanvas()), image = convertImage(this.layoutCanvas), (_c = this.watermarkCanvas) === null || _c === void 0 || _c.clear(), this.watermarkDom = document.createElement("div"), watermarkInnerDom = document.createElement("div"), this.watermarkDom.__WATERMARK__ = "watermark", this.watermarkDom.__WATERMARK__INSTANCE__ = this, parentElementType = this.checkParentElementType(), this.watermarkDom.style.cssText = `
        z-index:`.concat(this.options.zIndex, `!important;display:block!important;visibility:visible!important;transform:none!important;scale:none!important;
        `).concat(parentElementType === "custom" ? "top:0!important;bottom:0!important;left:0!important;right:0!important;height:100%!important;pointer-events:none!important;position:absolute!important;" : "position:relative!important;", `
      `), backgroundSize = generateBackgroundSize(this.options), watermarkInnerDom.style.cssText = `
        display:block!important;visibility:visible!important;pointer-events:none;top:0;bottom:0;left:0;right:0;transform:none!important;scale:none!important;
        position:`.concat(parentElementType === "root" ? "fixed" : "absolute", `!important;-webkit-print-color-adjust:exact!important;width:100%!important;height:100%!important;
        z-index:`).concat(this.options.zIndex, "!important;background-image:url(").concat(image, ")!important;background-repeat:").concat(this.options.backgroundRepeat, `!important;
        background-size:`).concat(backgroundSize[0], "px ").concat(backgroundSize[1], "px!important;background-position:").concat(this.options.backgroundPosition, `;
        `).concat(generateAnimationStyle(this.options.movable, this.options.backgroundRepeat), `
      `), this.watermarkDom.appendChild(watermarkInnerDom), this.parentElement.appendChild(this.watermarkDom), this.options.mutationObserve)
                try {
                  this.bindMutationObserver();
                } catch {
                  (_e = (_d = this.options).onObserveError) === null || _e === void 0 || _e.call(_d);
                }
              return firstDraw && ((_g = (_f = this.options).onSuccess) === null || _g === void 0 || _g.call(_f)), [3, 4];
            case 3:
              return this.isCreating = !1, [
                7
                /*endfinally*/
              ];
            case 4:
              return [
                2
                /*return*/
              ];
          }
        });
      });
    }, Watermark2.prototype.destroy = function() {
      this.remove(), this.watermarkDom = void 0;
    }, Watermark2.prototype.check = function() {
      return __awaiter(this, void 0, void 0, function() {
        return __generator(this, function(_a) {
          return [2, this.parentElement.contains(this.watermarkDom)];
        });
      });
    }, Watermark2.prototype.remove = function() {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      (_b = (_a = this.options).onBeforeDestroy) === null || _b === void 0 || _b.call(_a), (_c = this.observer) === null || _c === void 0 || _c.disconnect(), (_d = this.parentObserver) === null || _d === void 0 || _d.disconnect(), (_f = (_e = this.watermarkDom) === null || _e === void 0 ? void 0 : _e.parentNode) === null || _f === void 0 || _f.removeChild(this.watermarkDom), (_h = (_g = this.options).onDestroyed) === null || _h === void 0 || _h.call(_g);
    }, Watermark2.prototype.initConfigData = function(args, mode) {
      var _this = this;
      mode === void 0 && (mode = "overwrite"), mode === "append" ? Object.keys(args).forEach(function(key) {
        _this.props && (_this.props[key] = args[key]);
      }) : this.props = args, this.options = __assign(__assign({}, initialOptions), this.props), this.changeParentElement(this.options.parent), this.watermarkCanvas = new WatermarkCanvas(this.props, this.options);
    }, Watermark2.prototype.changeParentElement = function(parent) {
      if (typeof parent == "string") {
        var parentElement = document.querySelector(parent);
        parentElement && (this.parentElement = parentElement);
      } else
        this.parentElement = parent;
      this.parentElement || console.error("[WatermarkJsPlus]: please pass a valid parent element.");
    }, Watermark2.prototype.validateUnique = function() {
      var result = !0;
      return Array.from(this.parentElement.childNodes).forEach(function(node) {
        result && Object.hasOwnProperty.call(node, "__WATERMARK__") && (result = !1);
      }), result;
    }, Watermark2.prototype.validateContent = function() {
      switch (this.options.contentType) {
        case "image":
          return Object.hasOwnProperty.call(this.options, "image");
        case "multi-line-text":
        case "rich-text":
        case "text":
          return this.options.content.length > 0;
      }
    }, Watermark2.prototype.checkParentElementType = function() {
      return ["html", "body"].includes(this.parentElement.tagName.toLocaleLowerCase()) ? "root" : "custom";
    }, Watermark2.prototype.recreateOnMutation = function() {
      return __awaiter(this, void 0, void 0, function() {
        var _b, _c;
        return __generator(this, function(_d) {
          switch (_d.label) {
            case 0:
              return _d.trys.push([0, 2, , 3]), this.remove(), [4, this.create()];
            case 1:
              return _d.sent(), [3, 3];
            case 2:
              return _d.sent(), (_c = (_b = this.options).onObserveError) === null || _c === void 0 || _c.call(_b), [3, 3];
            case 3:
              return [
                2
                /*return*/
              ];
          }
        });
      });
    }, Watermark2.prototype.bindMutationObserver = function() {
      var _this = this;
      this.watermarkDom && (this.observer = new MutationObserver(function(mutationsList) {
        mutationsList.length > 0 && _this.recreateOnMutation();
      }), this.observer.observe(this.watermarkDom, {
        attributes: !0,
        // 属性的变动
        attributeFilter: ["style", "class", "hidden", "id"],
        // 仅监听会影响水印展示或标识的属性
        childList: !0,
        // 子节点的变动（指新增，删除或者更改）
        subtree: !0,
        // 布尔值，表示是否将该观察器应用于该节点的所有后代节点。
        characterData: !0
        // 节点内容或节点文本的变动。
      }), this.parentObserver = new MutationObserver(function(mutationsList) {
        var watermarkDom = _this.watermarkDom;
        if (watermarkDom) {
          var watermarkRemoved = mutationsList.some(function(item) {
            return Array.from(item.removedNodes).includes(watermarkDom);
          });
          watermarkRemoved && _this.recreateOnMutation();
        }
      }), this.parentObserver.observe(this.parentElement, {
        childList: !0
        // 子节点的变动（指新增，删除或者更改）
      }));
    }, Watermark2;
  })()
);

// node_modules/watermark-js-plus/dist/es/src/core/blind-decode.js
var blindDecodeFallback, applyBlindDecodeComposite = function(_a) {
  var ctx = _a.ctx, width = _a.width, height = _a.height, fillColor = _a.fillColor, compositeOperation = _a.compositeOperation, compositeTimes = _a.compositeTimes;
  if (compositeTimes > 0) {
    ctx.globalCompositeOperation, ctx.globalCompositeOperation = compositeOperation, ctx.globalCompositeOperation, ctx.fillStyle = fillColor;
    for (var i = 0; i < compositeTimes; i++)
      ctx.fillRect(0, 0, width, height);
  }
};

// node_modules/watermark-js-plus/dist/es/src/core/blind.js
var BlindWatermark = (
  /** @class */
  (function(_super) {
    __extends(BlindWatermark2, _super);
    function BlindWatermark2(props) {
      props === void 0 && (props = {});
      var defaultProps = {
        globalAlpha: 5e-3,
        mode: "blind"
      };
      return _super.call(this, __assign(__assign({}, props), defaultProps)) || this;
    }
    return BlindWatermark2.prototype.changeOptions = function() {
      return __awaiter(this, arguments, void 0, function(args, mode, redraw) {
        return args === void 0 && (args = {}), mode === void 0 && (mode = "overwrite"), redraw === void 0 && (redraw = !0), __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              return args.globalAlpha = 5e-3, args.mode = "blind", this.initConfigData(args, mode), protection(this.options.monitorProtection), redraw ? (this.remove(), [4, this.create()]) : [3, 2];
            case 1:
              _a.sent(), _a.label = 2;
            case 2:
              return [
                2
                /*return*/
              ];
          }
        });
      });
    }, BlindWatermark2.decode = function(props) {
      var _a = props.url, url = _a === void 0 ? "" : _a, _b = props.fillColor, fillColor = _b === void 0 ? "#000" : _b, _c = props.compositeOperation, compositeOperation = _c === void 0 ? "color-burn" : _c, _d = props.mode, mode = _d === void 0 ? "canvas" : _d, _e = props.compositeTimes, compositeTimes = _e === void 0 ? 3 : _e, onSuccess = props.onSuccess;
      if (url && mode === "canvas") {
        var img_1 = new Image();
        img_1.src = url, img_1.addEventListener("load", function() {
          var width = img_1.width, height = img_1.height, canvas = WatermarkCanvas.createCanvas(width, height), ctx = canvas.getContext("2d");
          if (!ctx)
            throw new Error("get context error");
          ctx.drawImage(img_1, 0, 0, width, height), applyBlindDecodeComposite({
            ctx,
            width,
            height,
            fillColor,
            compositeOperation,
            compositeTimes
          });
          var resultImage = convertImage(canvas);
          isFunction(onSuccess) && onSuccess?.(resultImage);
        });
      }
    }, BlindWatermark2;
  })(Watermark)
);

// packages/Watermark/src/conditions.ts
var getNamespacePrefixRegex = (namespaceNumber, namespaceIds) => RegExp(`^(?:${Object.entries(namespaceIds).filter(([, id]) => id === namespaceNumber).map(([name]) => name.toLowerCase()).join("|")}):`, "i"), normalizeTitle = (title, prefixRegex) => title.replace(/ /g, "_").replace(prefixRegex, "").trim(), decideScene = (ctx, displayedTitle) => {
  if (ctx.userGroups.includes("autoconfirmed"))
    return null;
  if (ctx.curRevisionId > 0 && ctx.revisionId > 0 && ctx.curRevisionId !== ctx.revisionId)
    return "history-revision";
  if ([2, 3].includes(ctx.namespaceNumber)) {
    if (ctx.action === "view" && ctx.articleId > 0) {
      let prefixRegex = getNamespacePrefixRegex(ctx.namespaceNumber, ctx.namespaceIds);
      if (normalizeTitle(displayedTitle, prefixRegex) !== normalizeTitle(ctx.pageName, prefixRegex))
        return "variant-check";
    }
    return null;
  }
  return ctx.namespaceNumber === 118 ? "draft" : null;
}, hasVariantMatch = (variantTitles, displayedTitle, prefixRegex) => {
  let normalizedDisplayed = normalizeTitle(displayedTitle, prefixRegex);
  return variantTitles.some((title) => normalizeTitle(title, prefixRegex) === normalizedDisplayed);
};

// packages/Watermark/src/options.ts
var contents = {
  "history-revision": `历史版本，非最新内容
不代表萌娘百科立场`,
  "user-page": `用户页面，非正式条目
不代表萌娘百科立场`,
  draft: `草稿页面，内容未经审核
不代表萌娘百科立场`
}, visibleOptions = {
  contentType: "multi-line-text",
  width: 300,
  height: 300,
  rotate: -15,
  fontSize: "24px",
  fontColor: "#000000",
  globalAlpha: 0.17,
  lineHeight: 30,
  textRowMaxWidth: 300,
  zIndex: 2147483647,
  mutationObserve: !0
}, auxiliaryOptions = {
  contentType: "multi-line-text",
  width: 400,
  height: 400,
  rotate: -15,
  fontSize: "24px",
  fontColor: "#000000",
  mutationObserve: !0
};

// packages/Watermark/src/index.ts
var fetchVariantTitles = async (pageName, articleId) => {
  let page = (await new mw.Api().post({
    action: "query",
    prop: "info",
    inprop: "varianttitles",
    titles: pageName
  })).query.pages[String(articleId)];
  return Object.values(page.varianttitles ?? {});
};
$(() => {
  (async () => {
    let { skin, wgAction, wgArticleId, wgNamespaceIds, wgNamespaceNumber, wgPageName, wgCurRevisionId, wgRevisionId, wgUserGroups } = mw.config.get(), ctx = {
      userGroups: wgUserGroups,
      skin,
      action: wgAction,
      articleId: wgArticleId,
      namespaceNumber: wgNamespaceNumber,
      namespaceIds: wgNamespaceIds,
      pageName: wgPageName,
      curRevisionId: wgCurRevisionId || -1,
      revisionId: wgRevisionId || -1
    }, displayedTitle = $("#firstHeading, #section_0").first().text(), scene = decideScene(ctx, displayedTitle), content = null;
    if (scene === "variant-check") {
      let variantTitles = await fetchVariantTitles(ctx.pageName, ctx.articleId);
      content = hasVariantMatch(variantTitles, displayedTitle, getNamespacePrefixRegex(ctx.namespaceNumber, ctx.namespaceIds)) ? null : contents["user-page"];
    } else scene !== null && (content = contents[scene]);
    content && (await new Watermark({ ...visibleOptions, content }).create(), ctx.skin === "moeskin" && await new BlindWatermark({ ...auxiliaryOptions, content }).create());
  })();
});
