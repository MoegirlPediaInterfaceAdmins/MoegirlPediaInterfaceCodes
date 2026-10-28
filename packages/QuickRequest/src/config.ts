import { CONFIG_PAGE } from "./constants.ts";
import { toErrorMessage } from "./errors.ts";
import { fetchPageContent } from "./api.ts";
import type { ConfigResult, ParamType, QuickRequestConfig, RequestParam, TypeConfig, TypeVariant } from "./types.ts";

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

/** 模块级预取 promise；失败后置空，下一次 open 重新拉取。 */
let prefetch: Promise<ConfigResult> | null = null;

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
const toRequestParam = (raw: unknown): RequestParam | null => {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }
    const { key, label, type, required, auto, "default": defaultValue } = raw as Record<string, unknown>;
    if (!isNonEmptyString(key) || !isNonEmptyString(label)) {
        return null;
    }
    const param: RequestParam = { key, label };
    if (isParamType(type)) {
        param.type = type;
    }
    if (typeof required === "boolean") {
        param.required = required;
    }
    if (auto === "currentPage") {
        param.auto = auto;
    }
    if (typeof defaultValue === "string") {
        param.default = defaultValue;
    }
    return param;
};

/**
 * 校验固定参数：只保留字符串到字符串的条目，其余静默丢弃。
 * @param raw 原始取值
 * @returns 固定参数；无合法条目时为 undefined
 */
const toFixedParams = (raw: unknown): Record<string, string> | undefined => {
    if (typeof raw !== "object" || raw === null) {
        return undefined;
    }
    const fixed: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value === "string") {
            fixed[key] = value;
        }
    }
    return Object.keys(fixed).length > 0 ? fixed : undefined;
};

/**
 * 校验单个变体条目，非法则返回 null。
 * requireAnyOf 只保留真实存在于本变体 parameters 的键（与类型级约束同样语义）；
 * 重复 id 由调用方去重——首个定义生效。
 * @param raw 原始条目
 * @returns 变体定义；非法时为 null
 */
const toTypeVariant = (raw: unknown): TypeVariant | null => {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }
    const { id, label, template, parameters, requireAnyOf, fixedParams } = raw as Record<string, unknown>;
    if (!isNonEmptyString(id) || !isNonEmptyString(label) || !isNonEmptyString(template)) {
        return null;
    }
    const variant: TypeVariant = { id, label, template };
    if (Array.isArray(parameters)) {
        variant.parameters = compact(parameters.map(toRequestParam));
    }
    if (Array.isArray(requireAnyOf)) {
        const keys = new Set((variant.parameters ?? []).map(({ key }) => key));
        const valid = requireAnyOf.filter((key): key is string => typeof key === "string" && keys.has(key));
        if (valid.length > 0) {
            variant.requireAnyOf = valid;
        }
    }
    const fixed = toFixedParams(fixedParams);
    if (fixed !== undefined) {
        variant.fixedParams = fixed;
    }
    return variant;
};

/**
 * 校验单个类型条目，非法则返回 null。
 * template 与 variants 至少要有一项：带变体的类型（userGroup）模板由各变体自带，
 * 类型级 template 可省略；两者皆无（或变体全非法）的条目没有可用内容，整条丢弃。
 * requireAnyOf 只保留真实存在于 parameters 的键，过滤后为空则丢弃该约束——
 * 引用不存在键的组约束没有可满足的路径，留在配置里只会让表单永远无法提交。
 * @param raw 原始条目
 * @returns 类型配置；非法时为 null
 */
const toTypeConfig = (raw: unknown): TypeConfig | null => {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }
    const { template, parameters, requireAnyOf, variants, fixedParams } = raw as Record<string, unknown>;
    const config: TypeConfig = {};
    if (isNonEmptyString(template)) {
        config.template = template;
    }
    const fixed = toFixedParams(fixedParams);
    if (fixed !== undefined) {
        config.fixedParams = fixed;
    }
    if (Array.isArray(parameters)) {
        config.parameters = compact(parameters.map(toRequestParam));
    }
    if (Array.isArray(requireAnyOf)) {
        const keys = new Set((config.parameters ?? []).map(({ key }) => key));
        const valid = requireAnyOf.filter((key): key is string => typeof key === "string" && keys.has(key));
        if (valid.length > 0) {
            config.requireAnyOf = valid;
        }
    }
    if (Array.isArray(variants)) {
        const seen = new Set<string>();
        const validVariants: TypeVariant[] = [];
        for (const entry of variants) {
            const variant = toTypeVariant(entry);
            if (variant && !seen.has(variant.id)) {
                seen.add(variant.id);
                validVariants.push(variant);
            }
        }
        if (validVariants.length > 0) {
            config.variants = validVariants;
        }
    }
    if (config.template === undefined && config.variants === undefined) {
        return null;
    }
    return config;
};

/**
 * 解析并校验配置内容；非法条目静默丢弃。
 * 全部类型条目非法时视为失败。
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

    const types = (parsed as { types?: unknown } | null)?.types;
    if (typeof types !== "object" || types === null) {
        return { ok: false, message: wgULS(`${CONFIG_PAGE} 缺少 types 对象`, `${CONFIG_PAGE} 缺少 types 物件`) };
    }

    const merged: Record<string, TypeConfig> = {};
    let validCount = 0;
    for (const [id, entry] of Object.entries(types)) {
        const config = toTypeConfig(entry);
        if (config) {
            merged[id] = config;
            validCount += 1;
        }
    }
    if (validCount === 0) {
        return { ok: false, message: wgULS(`${CONFIG_PAGE} 的类型列表为空或格式不正确`, `${CONFIG_PAGE} 的類型列表為空或格式不正確`) };
    }
    return { ok: true, config: { types: merged } };
};

/**
 * 启动配置预取。成功结果幂等（一次页面视图只拉一次）；失败不驻留——临时故障后
 * 下一次 open 会重新拉取，无需刷新页面恢复。
 * 永不 reject：失败会被转成 { ok: false } 结果，由主对话框的 configError 路径呈现。
 * @returns 配置结果
 */
const prefetchConfig = (): Promise<ConfigResult> => {
    prefetch ??= (async () => {
        let result: ConfigResult;
        try {
            result = parseConfig(await fetchPageContent(CONFIG_PAGE));
        } catch (error) {
            result = { ok: false, message: toErrorMessage(error) };
        }
        if (!result.ok) {
            prefetch = null;
        }
        return result;
    })();
    return prefetch;
};

/**
 * 判断组约束是否满足：requireAnyOf 所列键中至少一项非空。无约束时恒为真。
 * @param typeConfig 类型配置
 * @param values 参数名 → 值
 * @returns 是否满足
 */
const isGroupSatisfied = (typeConfig: TypeConfig, values: Record<string, string>): boolean => {
    const keys = typeConfig.requireAnyOf;
    if (keys === undefined || keys.length === 0) {
        return true;
    }
    return keys.some((key) => (values[key] ?? "").trim() !== "");
};

/**
 * 按 id 查找类型配置。
 * @param config 配置
 * @param id 请求类型 id
 * @returns 类型配置
 */
const findTypeConfig = (config: QuickRequestConfig, id: string): TypeConfig | undefined => config.types[id];

export { findTypeConfig, isGroupSatisfied, parseConfig, prefetchConfig };
