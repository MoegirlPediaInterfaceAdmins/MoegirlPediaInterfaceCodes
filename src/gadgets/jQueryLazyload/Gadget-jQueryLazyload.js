/**
 * @source https://github.com/tuupola/lazyload/compare/2.x...d3ad81c12332a0f950c6c703ff975b60350405a4
 * 更新后请同步更新上面链接到最新版本
 */
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
(() => {
    const defaults = {
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
    const extend = (_deep, ..._args) => {
        const extended = {};
        const deep = typeof _deep === "boolean" ? _deep : false;
        const args = [...typeof _deep !== "boolean" ? [_deep] : [], ..._args];

        /* Merge the object into the extended object */
        const merge = (obj) => {
            for (const prop in obj) {
                if (Object.prototype.hasOwnProperty.bind(obj)(prop)) {
                    /* If deep merge and property is an object, merge properties */
                    if (deep && Object.prototype.toString.bind(obj[prop])() === "[object Object]") {
                        extended[prop] = extend(true, extended[prop], obj[prop]);
                    } else {
                        extended[prop] = obj[prop];
                    }
                }
            }
        };

        /* Loop through each object and conduct a merge */
        for (const obj of args) {
            merge(obj);
        }

        return extended;
    };

    class LazyLoad {
        constructor(images, options) {
            this.settings = extend(defaults, options || {});
            this.images = images || document.querySelectorAll(this.settings.selector);
            this.observer = null;
            this.init();
        }
        init() {
            /* Without observers load everything and bail out early. */
            if (!window.IntersectionObserver) {
                this.loadImages();
                return;
            }

            const self = this;
            const observerConfig = {
                root: this.settings.root,
                rootMargin: this.settings.rootMargin,
                threshold: [this.settings.threshold],
            };

            this.observer = new IntersectionObserver((entries) => {
                Array.prototype.forEach.bind(entries)((entry) => {
                    if (entry.isIntersecting) {
                        self.observer.unobserve(entry.target);
                        const src = entry.target.getAttribute(self.settings.src);
                        const srcset = entry.target.getAttribute(self.settings.srcset);
                        if ("img" === entry.target.tagName.toLowerCase()) {
                            if (src) {
                                entry.target.src = src;
                            }
                            if (srcset) {
                                entry.target.srcset = srcset;
                            }
                        } else {
                            entry.target.style.backgroundImage = `url(${src})`;
                        }
                    }
                });
            }, observerConfig);

            Array.prototype.forEach.bind(this.images)((image) => {
                self.observer.observe(image);
            });
        }
        loadAndDestroy() {
            if (!this.settings) {
                return;
            }
            this.loadImages();
            this.destroy();
        }
        loadImages() {
            if (!this.settings) {
                return;
            }

            const self = this;
            Array.prototype.forEach.bind(this.images)((image) => {
                const src = image.getAttribute(self.settings.src);
                const srcset = image.getAttribute(self.settings.srcset);
                if ("img" === image.tagName.toLowerCase()) {
                    if (src) {
                        image.src = src;
                    }
                    if (srcset) {
                        image.srcset = srcset;
                    }
                } else {
                    image.style.backgroundImage = `url('${src}')`;
                }
            });
        }
        destroy() {
            if (!this.settings) {
                return;
            }
            this.observer.disconnect();
            this.settings = null;
        }
    }

    window.lazyload = (images, options) => new LazyLoad(images, options);

    if (window.jQuery) {
        jQuery.fn.lazyload = function (_options) {
            const options = _options || {};
            options.attribute ||= "data-src";
            new LazyLoad(this.toArray(), options);
            return this;
        };
    }
})();
