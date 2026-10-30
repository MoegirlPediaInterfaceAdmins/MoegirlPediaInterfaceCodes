/*
 * 只补 @types 里确实没有的两处（其余全局类型都来自仓库既有声明）：
 *   —— mw.widgets：types-mediawiki 未收录 mediawiki.widgets 的两个输入框；
 *   —— OO.ui.ProcessDialog.$body：@types/oojs-ui 只在文档注释里提过，没有正式声明。
 * 本文件是全局脚本声明文件（不带 import/export）。
 */

declare namespace mw.widgets {
    /**
     * 带标题联想的页面标题输入框（ResourceLoader 模块 mediawiki.widgets）。
     * $overlay 由 mediawiki.widgets 在运行时透传给内部菜单，但 @types/oojs-ui 未声明。
     */
    class TitleInputWidget extends OO.ui.TextInputWidget {
        /**
         * @param options 配置项，suggestions 开启标题联想，required 标记为必填
         */
        constructor(
            options: OO.ui.TextInputWidget.ConfigOptions & {
                suggestions?: boolean;
                required?: boolean;
                $overlay?: JQuery;
            },
        );
    }

    /**
     * 带用户名联想的输入框（ResourceLoader 模块 mediawiki.widgets.UserInputWidget）。
     * 内部按前缀查 action=query&list=allusers，$overlay 同样由 LookupElement 混入消费。
     */
    class UserInputWidget extends OO.ui.TextInputWidget {
        /**
         * @param options 配置项，limit 控制候选条数
         */
        constructor(
            options: OO.ui.TextInputWidget.ConfigOptions & {
                limit?: number;
                $overlay?: JQuery;
            },
        );
    }
}

declare namespace OO.ui {
    /**
     * 补充 @types/oojs-ui 未声明的 ProcessDialog 实例属性：$body 是对话框内容区
     * （OOUI 运行时真实存在，见 oojs-ui-windows.js；类型定义里只出现在示例注释中）。
     * $overlay / $content / $frame 已由 Window.Props 声明，无需重复补充。
     */
    interface ProcessDialog {
        /** 对话框内容区域的 jQuery 节点 */
        $body: JQuery;
    }
}

/**
 * ext.gadget.LocalObjectStorage 的全局类（@types 未收录）。
 * getItem 返回 JSON 反序列化后的原值（存什么类型返回什么类型），缺失时为 null。
 */
declare class LocalObjectStorage {
    /**
     * @param name 存储命名空间（localStorage 键前缀）
     */
    constructor(name: string);

    /**
     * @param key 存储键
     * @param fallback 缺失时的返回值，缺省 null
     */
    getItem(key: string, fallback?: unknown): unknown;

    /**
     * @param key 存储键
     * @param value 任意可 JSON 序列化的值
     */
    setItem(key: string, value: unknown): void;

    /**
     * @param key 存储键
     */
    removeItem(key: string): void;
}
