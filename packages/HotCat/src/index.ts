/* eslint-disable require-atomic-updates -- 启动期单次串行写入 */
import { HC } from "./config/hotcat.ts";
import { applyLocalization } from "./config/i18n.ts";
import { site, state } from "./runtime.ts";
import { initLocalization } from "./wikitext/patterns.ts";
import { closeForm, getState, setState } from "./ui/setup.ts";
import { run } from "./core/run.ts";
import type { SiteConfig } from "./types.ts";

// 禁止从共享资源获取翻译
window.hotcat_translations_from_commons = false;

const bootstrap = async (): Promise<void> => {
    await $.ready;
    const conf = (mw.config as unknown as { values: SiteConfig }).values;
    site.conf = conf;
    if (window.HotCat && !window.HotCat.nodeName || conf.wgAction === "edit") {
        return;
    }
    site.expandedScriptPrefix = new URL(conf.wgScript, location.href).href;
    site.expandedArticlePrefix = new URL(conf.wgArticlePath.replace("$1", ""), location.href).href;
    const userRights = await mw.user.getRights();
    const autopatrol = userRights.includes("autopatrol");
    site.skin = conf.skin;
    const ua = navigator.userAgent.toLowerCase();
    site.isWebkit = /applewebkit\/\d+/.test(ua) && !ua.includes("spoofer");
    window.hotcat_no_autocommit = !autopatrol;
    window.hotcat_del_needs_diff = !autopatrol;
    HC.no_autocommit = !autopatrol;
    HC.del_needs_diff = !autopatrol;
    window.HotCat = HC;
    applyLocalization();
    initLocalization();
    window.hotcat_get_state = () => getState();
    window.hotcat_set_state = (value) => setState(value);
    window.hotcat_close_form = () => {
        closeForm();
    };
    HC.runWhenReady = (callback) => {
        mw.hook("hotcat.ready").add(callback);
    };
    mw.config.set("disableAJAXCategories", true);
    if (conf.wgCanonicalSpecialPageName !== "Upload") {
        mw.hook("postEdit").add(() => {
            state.catLine = null;
            state.editors = [];
            state.initialized = false;
            HC.started = false;
            run();
        });
    }
    run();
};

void bootstrap();
