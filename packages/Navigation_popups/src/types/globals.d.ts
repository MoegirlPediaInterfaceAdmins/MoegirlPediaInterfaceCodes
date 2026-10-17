// Ambient declarations for site-provided globals (zh.moegirl.org.cn site-lib
// and gadgets) that have no public type packages. Types start loose and get
// tightened as the typing effort proceeds. This file is a global script
// declaration file on purpose (no imports/exports), so the declarations below
// land in the global scope.
declare const wgULS: (cn: string, tw: string, ...variants: (string | null)[]) => string;
declare const wgUVS: (cn: string, tw: string, ...variants: (string | null)[]) => string;
declare const wikEdUseWikEd: boolean;
declare const WikEdUpdateFrame: () => void;
// moment.js is site-provided at runtime; typings come from the moment package
// (moment.d.ts ends with `export = moment`, so it is a module, not a UMD global)
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- a global script d.ts cannot use module imports
declare const moment: typeof import("moment");

interface String {
    // Polyfill installed by parensplit.ts at module init; isNative marks
    // whether the native (non-polyfilled) split implementation is in use
    parenSplit: {
        // the polyfill path (String.split) also accepts a "/pattern/" string
        (re: RegExp | string): string[];
        isNative?: boolean;
    };
    // Extension installed by tools.ts at module init
    entify(): string;
}

interface Window {
    pg?: unknown;
    popupDebug?: boolean;
    popupLocalDebug?: boolean;
    popupStrings?: Record<string, string>;
    popupNoTranslation?: Set<string>;
}

// MediaWiki legacy edit form, present on ?action=edit pages
interface EditForm extends HTMLFormElement {
    wpTextbox1?: HTMLTextAreaElement;
    wpSummary?: HTMLInputElement;
    wpMinoredit?: HTMLInputElement;
    wpWatchthis?: HTMLInputElement;
    wpSave?: HTMLInputElement;
    wpPreview?: HTMLInputElement;
    wpDiff?: HTMLInputElement;
    [key: string]: unknown;
}

interface Document {
    // shortcutkeys.ts keeps the previous handler here
    oldPopupOnkeypress?: GlobalEventHandlers["onkeypress"];
    editform?: EditForm;
    // legacy IE selection object (document.selection.createRange().text)
    selection?: { createRange(): { text: string } };
    // legacy scroll offsets (undefined in modern browsers; read via || fallbacks)
    scrollLeft?: number;
    scrollTop?: number;
}

interface Node {
    // ad-hoc marker property the gadget sets on tooltip containers
    // (Element or Document — both are used as setupTooltips containers)
    ranSetupTooltipsAlready?: boolean;
}
