"use strict";
(() => {
    const localObjectStorage = new LocalObjectStorage("libLoadMessagesWithCache");
    const key = `messagesCache:${mw.config.get("wgUserLanguage")}`;
    mw.messages.set(localObjectStorage.getItem(key, {}));
    const api = new mw.Api();
    window.libLoadMessagesWithCache = {
        loadMessagesIfMissing: async (messages) => {
            const result = await api.loadMessagesIfMissing(messages);
            if (result === true) {
                const messagesCache = localObjectStorage.getItem(key, {});
                for (const message of messages) {
                    messagesCache[message] = mw.msg(message);
                }
                localObjectStorage.setItem(key, messagesCache);
            }
            return result;
        },
    };
})();
