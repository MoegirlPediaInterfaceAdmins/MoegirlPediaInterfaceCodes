import CatALot from "./CatALot.vue";
import { registerCodexComponents } from "./app.ts";
import { SUPPORTED_SPECIALS } from "./constants.ts";
import { Vue } from "./runtime.ts";
import "./index.css";

const shouldRunHere = (): boolean => {
    if (mw.config.get("wgAction") !== "view") {
        return false;
    }
    const namespaceNumber = mw.config.get("wgNamespaceNumber");
    if (namespaceNumber === 14) {
        return true;
    }
    if (namespaceNumber !== -1) {
        return false;
    }
    const canonicalSpecialPageName = mw.config.get("wgCanonicalSpecialPageName");
    return canonicalSpecialPageName !== false && SUPPORTED_SPECIALS.has(canonicalSpecialPageName);
};

const mount = (): void => {
    const mountElement = document.createElement("div");
    mountElement.className = "cal-app";
    document.body.appendChild(mountElement);
    const app = Vue.createMwApp(CatALot);
    registerCodexComponents(app);
    app.mount(mountElement);
};

const bootstrap = async (): Promise<void> => {
    try {
        await $.ready;
        if (!shouldRunHere()) {
            return;
        }
        mount();
    } catch (error) {
        mw.log.error(error);
    }
};

void bootstrap();
