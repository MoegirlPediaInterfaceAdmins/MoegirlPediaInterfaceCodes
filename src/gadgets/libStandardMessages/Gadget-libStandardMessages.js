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

    /* eslint-disable camelcase */
    mw.messages.set({
        media: wgULS("媒体", "媒體"),
        special: "特殊",
        blanknamespace: `（主${wgULS("", "", "", "", "要", "", "", "要", "")}）`,
        talk: wgULS("讨论", "討論"),
        user: wgULS("用户", "使用者"),
        user_talk: wgULS("用户讨论", "使用者討論"),
        project: "萌娘百科",
        project_talk: "萌娘百科讨论",
        file: wgULS("文件", "檔案"),
        file_talk: wgULS("文件讨论", "檔案討論"),
        mediawiki: wgULS("界面消息", "介面訊息"),
        mediawiki_talk: wgULS("界面消息讨论", "介面訊息討論"),
        template: "模板",
        template_talk: "模板讨论",
        help: wgULS("帮助", "說明"),
        help_talk: wgULS("帮助讨论", "說明討論"),
        category: wgULS("分类", "分類"),
        category_talk: wgULS("分类讨论", "分類討論"),
        widget: wgULS("小部件", "微件"),
        widget_talk: wgULS("小部件讨论", "微件討論"),
        timedtext: "TimedText",
        timedtext_talk: wgULS("TimedText讨论", "TimedText討論"),
        module: wgULS("模块", "模組"),
        module_talk: wgULS("模块讨论", "模組討論"),
    });
    /* eslint-enable camelcase */
    mw.config.set({
        libLocalizedNamespaces: {
            "-2": mw.msg("media"),
            "-1": mw.msg("special"),
            0: "",
            1: mw.msg("talk"),
            2: mw.msg("user"),
            3: mw.msg("user_talk"),
            4: mw.msg("project"),
            5: mw.msg("project_talk"),
            6: mw.msg("file"),
            7: mw.msg("file_talk"),
            8: mw.msg("mediawiki"),
            9: mw.msg("mediawiki_talk"),
            10: mw.msg("template"),
            11: mw.msg("template_talk"),
            12: mw.msg("help"),
            13: mw.msg("help_talk"),
            14: mw.msg("category"),
            15: mw.msg("category_talk"),
            274: mw.msg("widget"),
            275: mw.msg("widget_talk"),
            710: mw.msg("timedtext"),
            711: mw.msg("timedtext_talk"),
            828: mw.msg("module"),
            829: mw.msg("module_talk"),
        },
    });
})();
