"use strict";
var AsyncLock = function (opts) {
    opts = opts || {};
    this.Promise = opts.Promise || Promise;
    // format: {key : [fn, fn]}
    // queues[key] = null indicates no job running for key
    this.queues = Object.create(null);
    // lock is reentrant for same domain
    this.domainReentrant = opts.domainReentrant || false;
    if (this.domainReentrant) {
        if (typeof process === "undefined" || typeof process.domain === "undefined") {
            throw new Error("Domain-reentrant locks require `process.domain` to exist. Please flip `opts.domainReentrant = false`, " +
                "use a NodeJS version that still implements Domain, or install a browser polyfill.");
        }
        // domain of current running func {key : fn}
        this.domains = Object.create(null);
    }
    this.timeout = opts.timeout || AsyncLock.DEFAULT_TIMEOUT;
    this.maxOccupationTime = opts.maxOccupationTime || AsyncLock.DEFAULT_MAX_OCCUPATION_TIME;
    if (opts.maxPending === Infinity || Number.isInteger(opts.maxPending) && opts.maxPending >= 0) {
        this.maxPending = opts.maxPending;
    } else {
        this.maxPending = AsyncLock.DEFAULT_MAX_PENDING;
    }
};
AsyncLock.DEFAULT_TIMEOUT = 0; //Never
AsyncLock.DEFAULT_MAX_OCCUPATION_TIME = 0; //Never
AsyncLock.DEFAULT_MAX_PENDING = 1000;
/**
 * Acquire Locks
 *
 * @param {String|Array} key    resource key or keys to lock
 * @param {function} fn     async function
 * @param {function} cb     callback function, otherwise will return a promise
 * @param {Object} opts     options
 */
AsyncLock.prototype.acquire = function (key, fn, cb, opts) {
    if (Array.isArray(key)) {
        return this._acquireBatch(key, fn, cb, opts);
    }
    if (typeof fn !== "function") {
        throw new Error("You must pass a function to execute");
    }
    // faux-deferred promise using new Promise() (as Promise.defer is deprecated)
    let deferredResolve = null;
    let deferredReject = null;
    let deferred = null;
    if (typeof cb !== "function") {
        opts = cb;
        cb = null;
        // will return a promise
        deferred = new this.Promise((resolve, reject) => {
            deferredResolve = resolve;
            deferredReject = reject;
        });
    }
    opts = opts || {};
    let resolved = false;
    let timer = null;
    let occupationTimer = null;
    const self = this;
    const done = function (locked, err, ret) {
        if (occupationTimer) {
            clearTimeout(occupationTimer);
            occupationTimer = null;
        }
        if (locked) {
            if (!!self.queues[key] && self.queues[key].length === 0) {
                delete self.queues[key];
            }
            if (self.domainReentrant) {
                delete self.domains[key];
            }
        }
        if (!resolved) {
            if (!deferred) {
                if (typeof cb === "function") {
                    cb(err, ret);
                }
            } else {
                //promise mode
                if (err) {
                    deferredReject(err);
                } else {
                    deferredResolve(ret);
                }
            }
            resolved = true;
        }
        if (locked) {
            //run next func
            if (!!self.queues[key] && self.queues[key].length > 0) {
                self.queues[key].shift()();
            }
        }
    };
    let exec = function (locked) {
        if (resolved) { // may due to timed out
            return done(locked);
        }
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (self.domainReentrant && locked) {
            self.domains[key] = process.domain;
        }
        // Callback mode
        if (fn.length === 1) {
            let called = false;
            fn((err, ret) => {
                if (!called) {
                    called = true;
                    done(locked, err, ret);
                }
            });
        } else {
            // Promise mode
            self._promiseTry(() => {
                return fn();
            })
                .then((ret) => {
                    done(locked, undefined, ret);
                }, (error) => {
                    done(locked, error);
                });
        }
    };
    if (self.domainReentrant && !!process.domain) {
        exec = process.domain.bind(exec);
    }
    if (!self.queues[key]) {
        self.queues[key] = [];
        exec(true);
    } else if (self.domainReentrant && !!process.domain && process.domain === self.domains[key]) {
        // If code is in the same domain of current running task, run it directly
        // Since lock is re-enterable
        exec(false);
    } else if (self.queues[key].length >= self.maxPending) {
        done(false, new Error(`Too many pending tasks in queue ${key}`));
    } else {
        const taskFn = function () {
            exec(true);
        };
        if (opts.skipQueue) {
            self.queues[key].unshift(taskFn);
        } else {
            self.queues[key].push(taskFn);
        }
        const timeout = opts.timeout || self.timeout;
        if (timeout) {
            timer = setTimeout(() => {
                timer = null;
                done(false, new Error(`async-lock timed out in queue ${key}`));
            }, timeout);
        }
    }
    const maxOccupationTime = opts.maxOccupationTime || self.maxOccupationTime;
    if (maxOccupationTime) {
        occupationTimer = setTimeout(() => {
            if (self.queues[key]) {
                done(false, new Error(`Maximum occupation time is exceeded in queue ${key}`));
            }
        }, maxOccupationTime);
    }
    if (deferred) {
        return deferred;
    }
};
/*
 * Below is how this function works:
 *
 * Equivalent code:
 * self.acquire(key1, function(cb){
 *     self.acquire(key2, function(cb){
 *         self.acquire(key3, fn, cb);
 *     }, cb);
 * }, cb);
 *
 * Equivalent code:
 * var fn3 = getFn(key3, fn);
 * var fn2 = getFn(key2, fn3);
 * var fn1 = getFn(key1, fn2);
 * fn1(cb);
 */
AsyncLock.prototype._acquireBatch = function (keys, fn, cb, opts) {
    if (typeof cb !== "function") {
        opts = cb;
        cb = null;
    }
    const self = this;
    const getFn = function (key, fn) {
        return function (cb) {
            self.acquire(key, fn, cb, opts);
        };
    };
    let fnx = fn;
    keys.reverse().forEach((key) => {
        fnx = getFn(key, fnx);
    });
    if (typeof cb === "function") {
        fnx(cb);
    } else {
        return new this.Promise((resolve, reject) => {
            // check for promise mode in case keys is empty array
            if (fnx.length === 1) {
                fnx((err, ret) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(ret);
                    }
                });
            } else {
                resolve(fnx());
            }
        });
    }
};
/*
 *  Whether there is any running or pending asyncFunc
 *
 *  @param {String} key
 */
AsyncLock.prototype.isBusy = function (key) {
    if (!key) {
        return Object.keys(this.queues).length > 0;
    }

    return !!this.queues[key];

};
/**
 * Promise.try() implementation to become independent of Q-specific methods
 */
AsyncLock.prototype._promiseTry = function (fn) {
    try {
        return this.Promise.resolve(fn());
    }
    catch (e) {
        return this.Promise.reject(e);
    }
};
window.AsyncLock = AsyncLock;