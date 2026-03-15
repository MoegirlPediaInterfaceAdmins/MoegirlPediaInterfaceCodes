"use strict";
(() => {
    class LibRequestAnimationFrame {
        #handle = null;
        #actions = new Set();
        request(action) {
            this.#actions.add(action);
            if (this.#handle === null) {
                this.#handle = window.requestAnimationFrame((...args) => {
                    this.#actions.forEach((action) => action(...args));
                    this.#handle = null;
                    this.#actions.clear();
                });
            }
            return this.#handle;
        }
        cancel() {
            if (this.#handle !== null) {
                window.cancelAnimationFrame(this.#handle);
                this.#handle = null;
            }
        }
    }
    const instance = new LibRequestAnimationFrame();
    window.libRequestAnimationFrame = {
        LibRequestAnimationFrame,
        requestAnimationFrameOnce: (action) => instance.request(action),
    };
})();
