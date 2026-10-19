import { HC } from "../config/hotcat.ts";
import { site } from "../runtime.ts";
import { param } from "../util/text.ts";
import { initialize } from "./initialize.ts";
import { getPage, setState, setup, setupUpload } from "../ui/setup.ts";

/** 页面是否提供编辑入口（老皮肤看顶栏链接，其余看 ca-edit） */
const can_edit = (): boolean => {
    switch (site.skin) {
        case "cologneblue":
        case "standard":
        case "nostalgia": {
            let container = site.skin === "cologneblue" ? document.getElementById("quickbar") : null;
            if (!container) {
                container = document.getElementById("topbar");
            }
            if (!container) {
                return false;
            }
            const lks = container.getElementsByTagName("a");
            for (let i = 0; i < lks.length; i++) {
                if (param("title", lks[i].href) === site.conf.wgPageName && param("action", lks[i].href) === "edit") {
                    return true;
                }
            }
            return false;
        }
        default:
            return document.getElementById("ca-edit") !== null;
    }
};

/** 启动逻辑。 */
const reallyRun = (): void => {
    initialize();
    if (!HC.upload_disabled && site.conf.wgNamespaceNumber === -1 && site.conf.wgCanonicalSpecialPageName === "Upload" && site.conf.wgUserName) {
        setupUpload();
        setup(() => {
            if (window.UploadForm && window.UploadForm.previous_hotcat_state) {
                window.UploadForm.previous_hotcat_state = setState(window.UploadForm.previous_hotcat_state);
            }
        });
    } else {
        if (!site.conf.wgIsArticle || site.conf.wgAction !== "view" || param("diff") !== null || param("oldid") !== null || !can_edit() || HC.disable()) {
            return;
        }
        if (!HC.isSupportedContentModel()) {
            const issueURL = new URL("https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/issues/new?template=BLANK_ISSUE");
            issueURL.searchParams.set("title", "[HOTCAT] 未知的 contentModel");
            issueURL.searchParams.set("body", `页面 <${new URL(`/${site.conf.wgPageName}`, location.href)}> 使用了未知的 contentModel \`${site.conf.wgPageContentModel}\`，导致 HotCat 无法正常工作。请调查这个问题。`);
            console.warn(`[HOTCAT] 本页面 <${site.conf.wgPageName}> 使用了未知的 contentModel "${site.conf.wgPageContentModel}"。如果你看到此信息，请报告此问题至 ${issueURL.toString()}`);
        }
        getPage();
    }
};

/** 一次性运行闸门。 */
const run = (): void => {
    if (HC.started) {
        return;
    }
    HC.started = true;
    reallyRun();
};

export { can_edit, reallyRun, run };
