"use strict";
(() => {
    const localObjectStorage = new LocalObjectStorage(`libLoadMessagesWithCache:${mw.config.get("wgUserLanguage")}`);
    mw.messages.set(localObjectStorage.getItem("messagesCache", {}));
    const api = new mw.Api();
    window.libLoadMessagesWithCache = {
        loadMessagesIfMissing: async (messages) => {
            const result = await api.loadMessagesIfMissing(messages);
            if (result === true) {
                const messagesCache = localObjectStorage.getItem("messagesCache", {});
                for (const message of messages) {
                    messagesCache[message] = mw.msg(message);
                }
                localObjectStorage.setItem("messagesCache", messagesCache);
            }
            return result;
        },
    };
})();
