/*!
 * Lazy Load - JavaScript plugin for lazy loading images
 *
 * Copyright (c) 2007-2019 Mika Tuupola
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   https://appelsiini.net/projects/lazyload
 *
 * Version: 2.0.0-rc.2
 *
 */
"use strict";
(function () {
    var defaults = {
        src: "data-src",
        srcset: "data-srcset",
        selector: ".lazyload",
        root: null,
        rootMargin: "0px",
        threshold: 0,
    };
    /**
    * Merge two or more objects. Returns a new object.
    * @private
    * @param {Boolean}  deep     If true, do a deep (or recursive) merge [optional]
    * @param {Object}   objects  The objects to merge together
    * @returns {Object}          Merged values of defaults and options
    */
    var extend = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var extended = {};
        var deep = false;
        var i = 0;
        var length = args.length;
        /* Check if a deep merge */
        if (Object.prototype.toString.call(args[0]) === "[object Boolean]") {
            deep = args[0];
            i++;
        }
        /* Merge the object into the extended object */
        var merge = function (obj) {
            for (var prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    /* If deep merge and property is an object, merge properties */
                    if (deep && Object.prototype.toString.call(obj[prop]) === "[object Object]") {
                        extended[prop] = extend(true, extended[prop], obj[prop]);
                    }
                    else {
                        extended[prop] = obj[prop];
                    }
                }
            }
        };
        /* Loop through each object and conduct a merge */
        for (; i < length; i++) {
            var obj = args[i];
            merge(obj);
        }
        return extended;
    };
    var LazyLoad = /** @class */ (function () {
        function LazyLoad(images, options) {
            this.settings = extend(defaults, options || {});
            this.images = images || document.querySelectorAll(this.settings.selector);
            this.observer = null;
            this.init();
        }
        LazyLoad.prototype.init = function () {
            /* Without observers load everything and bail out early. */
            if (!window.IntersectionObserver) {
                this.loadImages();
                return;
            }
            var self = this;
            var observerConfig = {
                root: this.settings.root,
                rootMargin: this.settings.rootMargin,
                threshold: [this.settings.threshold],
            };
            this.observer = new IntersectionObserver(function (entries) {
                Array.prototype.forEach.call(entries, function (entry) {
                    if (entry.isIntersecting) {
                        self.observer.unobserve(entry.target);
                        var src = entry.target.getAttribute(self.settings.src);
                        var srcset = entry.target.getAttribute(self.settings.srcset);
                        if ("img" === entry.target.tagName.toLowerCase()) {
                            if (src) {
                                entry.target.src = src;
                            }
                            if (srcset) {
                                entry.target.srcset = srcset;
                            }
                        }
                        else {
                            entry.target.style.backgroundImage = "url(" + src + ")";
                        }
                    }
                });
            }, observerConfig);
            Array.prototype.forEach.call(this.images, function (image) {
                self.observer.observe(image);
            });
        };
        LazyLoad.prototype.loadAndDestroy = function () {
            if (!this.settings) {
                return;
            }
            this.loadImages();
            this.destroy();
        };
        LazyLoad.prototype.loadImages = function () {
            if (!this.settings) {
                return;
            }
            var self = this;
            Array.prototype.forEach.call(this.images, function (image) {
                var src = image.getAttribute(self.settings.src);
                var srcset = image.getAttribute(self.settings.srcset);
                if ("img" === image.tagName.toLowerCase()) {
                    if (src) {
                        image.src = src;
                    }
                    if (srcset) {
                        image.srcset = srcset;
                    }
                }
                else {
                    image.style.backgroundImage = "url('" + src + "')";
                }
            });
        };
        LazyLoad.prototype.destroy = function () {
            if (!this.settings) {
                return;
            }
            this.observer.disconnect();
            this.settings = null;
        };
        return LazyLoad;
    }());
    window.lazyload = function (images, options) {
        return new LazyLoad(images, options);
    };
    if (window.jQuery) {
        var $_1 = window.jQuery;
        $_1.fn.lazyload = function (_options) {
            var options = _options || {};
            options.attribute = options.attribute || "data-src";
            new LazyLoad($_1.makeArray(this), options);
            return this;
        };
    }
})();