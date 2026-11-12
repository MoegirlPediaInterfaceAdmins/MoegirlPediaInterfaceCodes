// mw.widgets 本地扩展声明（types-mediawiki 不覆盖）；RL：mediawiki.widgets(.CategoryMultiselectWidget)
// TitleInputWidget 已在 packages/UserMessages/src/oo.d.ts 声明为 OO.ui.TextInputWidget 子类，
// 这里只补充本包用到的配置项，避免重复声明类成员造成冲突。
declare namespace mw.widgets {
    interface TitleInputWidgetConfig extends OO.ui.TextInputWidget.ConfigOptions {
        namespace?: number;
        relative?: boolean;
        showImages?: boolean;
        showDescriptions?: boolean;
        api?: mw.Api;
        /** 与 packages/UserMessages 的声明合并时补全的选项 */
        suggestions?: boolean;
        $overlay?: JQuery;
    }

    class TitleInputWidget extends OO.ui.TextInputWidget {
        constructor(config?: TitleInputWidgetConfig);
        /** OOUI 控件实例的销毁方法（@types/oojs-ui 未在基类声明） */
        destroy(): void;
    }

    interface CategoryMultiselectWidgetConfig {
        placeholder?: string;
        limit?: number;
        api?: mw.Api;
    }

    class CategoryMultiselectWidget {
        constructor(config?: CategoryMultiselectWidgetConfig);
        $element: { 0: HTMLElement };
        getValue(): string[];
        setValue(value: string[]): void;
        on(event: string, callback: (...args: unknown[]) => void): void;
        setDisabled(disabled: boolean): void;
        destroy(): void;
    }
}
