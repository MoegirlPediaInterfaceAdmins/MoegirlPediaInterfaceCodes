import type { App, Component } from "vue";
import { Codex, Vue } from "./runtime.ts";
import { createState } from "./state.ts";
import type { ReactiveFactory } from "./types.ts";

const makeReactive: ReactiveFactory = <T extends object>(value: T): T => Vue.reactive(value) as unknown as T;

const FallbackInfoChip = Vue.defineComponent({
    name: "CatALotFallbackInfoChip",
    props: {
        status: {
            type: String,
            "default": "notice",
        },
    },
    setup: (props, { slots }) => () => Vue.h(
        "span",
        { "class": ["cal-chip", `cal-chip--${props.status}`] },
        slots.default?.(),
    ),
});

const registerCodexComponents = (app: App): void => {
    const components: Record<string, Component> = {
        "cdx-button": Codex.CdxButton,
        "cdx-checkbox": Codex.CdxCheckbox,
        "cdx-dialog": Codex.CdxDialog,
        "cdx-field": Codex.CdxField,
        "cdx-icon": Codex.CdxIcon,
        "cdx-info-chip": Codex.CdxInfoChip ?? FallbackInfoChip,
        "cdx-progress-bar": Codex.CdxProgressBar,
        "cdx-select": Codex.CdxSelect,
        "cdx-text-input": Codex.CdxTextInput,
    };
    for (const [name, component] of Object.entries(components)) {
        app.component(name, component);
    }
};

const component = Vue.defineComponent({
    name: "CatALotApp",
    setup: () => {
        const state = createState(makeReactive);
        Vue.onMounted(() => {
            state.init();
        });
        return state;
    },
});

export { registerCodexComponents, component };
