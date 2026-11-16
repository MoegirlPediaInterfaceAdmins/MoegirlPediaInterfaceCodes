import type { App, Component, DefineComponent, EmitsOptions } from "vue";
import type { WatchlistOption } from "./types.ts";

interface CodexDialogAction {
    label: string;
    actionType?: "default" | "progressive" | "destructive";
}

interface CodexMenuItem {
    label: string;
    value: string;
    disabled?: boolean;
}

/* eslint-disable @typescript-eslint/no-empty-object-type -- DefineComponent 的占位泛型参数只能是 {}，换成 object 会破坏其条件类型 */
type CodexComponent<Props, Emits extends EmitsOptions = {}>
    = DefineComponent<Props, {}, {}, {}, {}, {}, {}, Emits>;
/* eslint-enable @typescript-eslint/no-empty-object-type */

interface CdxButtonProps {
    size?: "x-small" | "small" | "medium" | "large" | "x-large";
    weight?: "quiet" | "normal" | "primary";
    action?: "default" | "progressive" | "destructive";
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    "aria-label"?: string;
}

interface CdxCheckboxProps {
    modelValue?: boolean;
    disabled?: boolean;
    id?: string;
}

interface CdxDialogProps {
    open?: boolean;
    title?: string;
    useCloseButton?: boolean;
    primaryAction?: CodexDialogAction;
    defaultAction?: CodexDialogAction | undefined;
}

interface CdxFieldProps {
    label?: string;
    optional?: boolean;
    help?: string;
}

interface CdxIconProps {
    icon?: string;
    size?: "x-small" | "small" | "medium" | "large";
}

type CdxInfoChipStatus = "notice" | "warning" | "error" | "success";

interface CdxInfoChipProps {
    status?: CdxInfoChipStatus;
    icon?: string;
}

interface CdxProgressBarProps {
    progress?: number;
    "aria-label"?: string;
}

interface CdxSelectProps {
    selected?: WatchlistOption;
    menuItems?: readonly CodexMenuItem[];
    disabled?: boolean;
}

interface CdxTextInputProps {
    modelValue?: string;
    placeholder?: string;
    disabled?: boolean;
    inputType?: string;
    id?: string;
}

declare module "vue" {
    // types-mediawiki 的同名声明合并到 CJS 的 vue.d.ts；ESM 解析到 vue.d.mts，这里补一份。
    const createMwApp: (component: Component) => App;

    interface GlobalComponents {
        CdxButton: CodexComponent<CdxButtonProps>;
        CdxCheckbox: CodexComponent<
            CdxCheckboxProps,
            { "update:modelValue": (value: boolean) => void }
        >;
        CdxDialog: CodexComponent<
            CdxDialogProps,
            {
                "update:open": (open: boolean) => void;
                primary: () => void;
                "default": () => void;
            }
        >;
        CdxField: CodexComponent<CdxFieldProps>;
        CdxIcon: CodexComponent<CdxIconProps>;
        CdxInfoChip: CodexComponent<CdxInfoChipProps>;
        CdxProgressBar: CodexComponent<CdxProgressBarProps>;
        CdxSelect: CodexComponent<
            CdxSelectProps,
            { "update:selected": (value: WatchlistOption) => void }
        >;
        CdxTextInput: CodexComponent<
            CdxTextInputProps,
            {
                "update:modelValue": (value: string) => void;
                input: (value: string) => void;
            }
        >;
    }
}

export type { CodexDialogAction, CodexMenuItem, CdxInfoChipStatus };
