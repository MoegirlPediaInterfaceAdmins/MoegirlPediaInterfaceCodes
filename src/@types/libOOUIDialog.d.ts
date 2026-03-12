type option = OO.ui.MessageDialog.SetupDataMap & {
    allowFullscreen?: boolean,
}

type JQueryTextSetterArgument = JQuery["text"] extends {
    (text: infer T): unknown;
    (): string;
} ? T : never;

function oouiDialogNormalMethod(textORjQuery: string | JQuery, _option?: option): JQuery.Promise<void>;

declare const oouiDialog: {
    alert: typeof oouiDialogNormalMethod;

    confirm: typeof oouiDialogNormalMethod;

    prompt: (textORjQuery: string | JQuery, defaultValue?: string, _option?: option & {
        textInput?: Omit<OO.ui.TextInputWidget.ConfigOptions, "autocomplete">,
        required?: boolean,
    }) => JQuery.Promise<string | null>;
    sanitize: (text: JQueryTextSetterArgument) => string;
}
