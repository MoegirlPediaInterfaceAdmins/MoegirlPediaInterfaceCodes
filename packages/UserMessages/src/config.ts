import { CONFIG_PAGE, DEFAULT_SIGNATURE_SUFFIX } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";
import { fetchPageContent } from "./api.ts";
import type { ConfigResult, ParamType, TemplateEntry, TemplateParam, UserMessagesConfig } from "./types.ts";

/** 合法的控件类型集合。 */
const PARAM_TYPES = new Set<string>(["page", "user", "text", "multiline"]);

/**
 * 判断是否为合法的控件类型。
 * @param value 待判断的值
 * @returns 是否合法
 */
const isParamType = (value: unknown): value is ParamType => typeof value === "string" && PARAM_TYPES.has(value);

/**
 * 滤掉校验未通过的条目。
 * @param items 待过滤的条目
 * @returns 合法条目
 */
const compact = <T>(items: (T | null)[]): T[] => items.filter((item): item is T => item !== null);

/** 模块级预取 promise（幂等）。 */
let prefetch: Promise<ConfigResult> | null = null;

/** 预取结果快照，未落定时为 null。 */
let settled: ConfigResult | null = null;

/**
 * 判断是否为非空字符串。
 * @param value 待判断的值
 * @returns 是否非空
 */
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/**
 * 校验单个参数定义，非法则返回 null。
 * @param raw 原始条目
 * @returns 参数定义；非法时为 null
 */
const toTemplateParam = (raw: unknown): TemplateParam | null => {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }
    const { key, label, type, required, "default": defaultValue } = raw as Record<string, unknown>;
    if (!isNonEmptyString(key) || !isNonEmptyString(label)) {
        return null;
    }
    const param: TemplateParam = { key, label };
    if (isParamType(type)) {
        param.type = type;
    }
    if (typeof required === "boolean") {
        param.required = required;
    }
    if (typeof defaultValue === "string") {
        param.default = defaultValue;
    }
    return param;
};

/**
 * 校验单个模板条目，非法则返回 null。
 * @param raw 原始条目
 * @returns 模板条目；非法时为 null
 */
const toTemplateEntry = (raw: unknown): TemplateEntry | null => {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }
    const { title, template, summary, parameters } = raw as Record<string, unknown>;
    if (!isNonEmptyString(title) || !isNonEmptyString(template)) {
        return null;
    }
    const entry: TemplateEntry = {
        title,
        template,
        summary: typeof summary === "string" ? summary : "",
    };
    if (Array.isArray(parameters)) {
        entry.parameters = compact(parameters.map(toTemplateParam));
    }
    return entry;
};

/**
 * 解析并校验配置页内容。非法条目静默丢弃；全部非法时视为失败。
 * @param raw 配置页的原始文本
 * @returns 配置结果
 */
const parseConfig = (raw: string): ConfigResult => {
    if (raw.trim() === "") {
        return { ok: false, message: wgULS(`页面 ${CONFIG_PAGE} 不存在或内容为空`, `頁面 ${CONFIG_PAGE} 不存在或內容為空`) };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        return { ok: false, message: wgULS(`JSON 解析失败：${toErrorMessage(error)}`, `JSON 解析失敗：${toErrorMessage(error)}`) };
    }

    const templates = (parsed as { templates?: unknown } | null)?.templates;
    if (!Array.isArray(templates)) {
        return { ok: false, message: wgULS(`${CONFIG_PAGE} 缺少 templates 数组`, `${CONFIG_PAGE} 缺少 templates 陣列`) };
    }

    const valid = compact(templates.map(toTemplateEntry));
    if (valid.length === 0) {
        return { ok: false, message: wgULS(`${CONFIG_PAGE} 的模板列表为空或格式不正确`, `${CONFIG_PAGE} 的模板列表為空或格式不正確`) };
    }
    return { ok: true, config: { templates: valid } };
};

/**
 * 读取并校验 window.UserMessages.templates，非法条目静默丢弃。
 * @returns 自定义模板列表
 */
const parseCustomTemplates = (): TemplateEntry[] => {
    const raw = window.UserMessages?.templates;
    if (!Array.isArray(raw)) {
        return [];
    }
    return compact(raw.map(toTemplateEntry));
};

/**
 * 取尾随签名。window.UserMessages.signatureSuffix 优先，未配置时用源码里的默认值。
 * 只判断类型：空串是合法配置，表示不加签名。
 * @returns 尾随签名
 */
const getSignatureSuffix = (): string => {
    const configured = window.UserMessages?.signatureSuffix;
    return typeof configured === "string" ? configured : DEFAULT_SIGNATURE_SUFFIX;
};

/**
 * 合并预置与自定义模板：同名 title 由自定义覆盖预置，自定义统一置于末尾。
 * @param preset 预置模板
 * @param custom 自定义模板
 * @returns 合并后的模板列表
 */
const mergeTemplates = (preset: TemplateEntry[], custom: TemplateEntry[]): TemplateEntry[] => {
    const customTitles = new Set(custom.map((entry) => entry.title));
    const kept = preset.filter((entry) => !customTitles.has(entry.title));
    return [...kept, ...custom];
};

/**
 * 启动模板配置预取。幂等，入口初始化时调用一次即可。
 * 预置（配置页）与自定义（window.UserMessages.templates）在此合并：
 * 自定义追加在预置之后并覆盖同名项；配置页失败但有自定义时降级为仅用自定义。
 * 永不 reject：失败会被转成 { ok: false } 结果。
 * @returns 配置结果
 */
const prefetchConfig = (): Promise<ConfigResult> => {
    prefetch ??= (async () => {
        let preset: ConfigResult;
        try {
            preset = parseConfig(await fetchPageContent(CONFIG_PAGE));
        } catch (error) {
            preset = { ok: false, message: toErrorMessage(error) };
        }

        const custom = parseCustomTemplates();
        if (preset.ok) {
            settled = { ok: true, config: { templates: mergeTemplates(preset.config.templates, custom) } };
        } else if (custom.length > 0) {
            settled = { ok: true, config: { templates: custom } };
        } else {
            settled = preset;
        }
        return settled;
    })();
    return prefetch;
};

/**
 * 取预取结果快照，供入口在打开对话框前做同步判断。
 * @returns 已落定的结果；尚未落定时为 null
 */
const getSettledConfig = (): ConfigResult | null => settled;

/**
 * 按 title 查找模板。
 * @param config 配置
 * @param title 模板 title
 * @returns 模板条目
 */
const findTemplate = (config: UserMessagesConfig, title: string): TemplateEntry | undefined => config.templates.find((entry) => entry.title === title);

export { findTemplate, getSettledConfig, getSignatureSuffix, prefetchConfig };
