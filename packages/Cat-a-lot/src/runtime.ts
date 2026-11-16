import type * as VueModule from "vue";
import type { Component } from "vue";

// Vue/Codex 由 ResourceLoader 提供，构建时不打包。
const Vue = mw.loader.require("vue") as unknown as typeof VueModule;

interface CodexRuntime {
    readonly CdxButton: Component;
    readonly CdxCheckbox: Component;
    readonly CdxDialog: Component;
    readonly CdxField: Component;
    readonly CdxIcon: Component;
    readonly CdxInfoChip?: Component;
    readonly CdxProgressBar: Component;
    readonly CdxSelect: Component;
    readonly CdxTextInput: Component;
}

const Codex = mw.loader.require("@wikimedia/codex") as unknown as CodexRuntime;

export type { CodexRuntime };
export { Vue, Codex };
