"use strict";
(() => {
    const localObjectStorage = new LocalObjectStorage("libLoadMessagesWithCache", { expires: [1, "days"] });
    const key = mw.config.get("wgUserLanguage");
    mw.messages.set(localObjectStorage.getItem(key, {}));
    const loadMessagesIfMissing = mw.Api.prototype.loadMessagesIfMissing;
    mw.Api.prototype.loadMessagesIfMissing = async function (messages) {
        const result = await loadMessagesIfMissing.bind(this)(messages);
        if (result === true) {
            const messagesCache = localObjectStorage.getItem(key, {});
            for (const message of messages) {
                messagesCache[message] = mw.msg(message);
            }
            localObjectStorage.setItem(key, messagesCache);
        }
        return result;
    };
})();
