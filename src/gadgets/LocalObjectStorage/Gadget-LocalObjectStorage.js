"use strict";
(() => {
    const builtinTransformations = [
        {
            type: "undefined",
            match: (t) => typeof t === "undefined",
            encode: () => "undefined",
            decode: () => undefined,
        },
        {
            type: "bigint",
            match: (t) => typeof t === "bigint",
            encode: (b) => `${b}`,
            decode: (b) => BigInt(b),
        },
        {
            type: "date",
            match: (t) => t instanceof Date,
            encode: (d) => d.toISOString(),
            decode: (d) => new Date(d),
        },
        {
            type: "set",
            match: (t) => t instanceof Set,
            encode: (s) => JSON.stringify([...s.values()]),
            decode: (s) => new Set(JSON.parse(s)),
        },
        {
            type: "map",
            match: (t) => t instanceof Map,
            encode: (m) => JSON.stringify([...m.entries()]),
            decode: (m) => new Map(JSON.parse(m)),
        },
        {
            type: "regexp",
            match: (t) => t instanceof RegExp,
            encode: (r) => `${r}`,
            decode: (r) => new RegExp(r.slice(1, r.length - 1)),
        },
    ];
    const externalTransformations = [];
    class LocalObjectStorage {
        static plugins = {
            transformations: {
                get list() {
                    return externalTransformations.map((transformation) => Object.assign(Object.create(null), transformation));
                },
                add: ({ type, match, decode, encode }) => {
                    if (type.includes("|")) {
                        console.error(`LocalObjectStorage can't accept type name "${type}" including "|", skip...`);
                        return false;
                    }
                    if (["JSON"].includes(type)) {
                        console.error(`LocalObjectStorage can't accept type name "${type}" from custom transformations, skip...`);
                        return false;
                    }
                    if ([...builtinTransformations, ...LocalObjectStorage.plugins.transformations.list].some(({ type: eType }) => eType === type)) {
                        console.error(`LocalObjectStorage can't accept duplicated type name "${type}" from custom transformations, skip...`);
                        return false;
                    }
                    if (typeof match !== "function" || typeof decode !== "function" || typeof encode !== "function") {
                        console.error(`LocalObjectStorage can't accept broken transformation [ type: "${type}", match: ${typeof match}, decode: ${typeof decode}, encode: ${typeof encode} ], skip...`);
                        return false;
                    }
                    externalTransformations.push({ type, match, decode, encode });
                    return true;
                },
            },
        };
        #keyPrefix;
        #expires;
        static #EXPIRES_PREFIX = "__EXPIRES__";
        constructor(prefix = "", { expires } = {}) {
            if (prefix === "default") {
                throw new Error(`LocalObjectStorage can't accept prefix "${prefix}".`);
            }
            if (prefix.includes("/")) {
                throw new Error(`LocalObjectStorage can't accept prefix "${prefix}" including "/".`);
            }
            this.#keyPrefix = `AnnTool-localObjectStorage/${prefix?.length > 0 ? `${prefix}/` : "default/"}`;
            if (expires !== undefined) {
                if (!Array.isArray(expires) || expires.length !== 2) {
                    throw new Error("LocalObjectStorage can't accept invalid expires option.");
                }
                this.#expires = expires;
            }
        }
        get _keyPrefix() {
            return this.#keyPrefix;
        }
        #calcExpiresAtPrefix = (expires) => {
            if (!this.#expires) {
                return "";
            }
            return `${LocalObjectStorage.#EXPIRES_PREFIX}${moment().add(expires?.[0] ?? this.#expires[0], expires?.[1] ?? this.#expires[1]).valueOf()}|`;
        };
        #getAllKeys = () => Object.keys(localStorage).filter((key) => key.startsWith(this.#keyPrefix));
        getAllKeys() {
            return this.#getAllKeys().map((n) => n.replace(this.#keyPrefix, ""));
        }
        get length() {
            return this.#getAllKeys().length;
        }
        getItem(key, fallback) {
            let value = localStorage.getItem(`${this.#keyPrefix}${key}`);
            if (value === null) {
                return fallback ?? value;
            }
            if (value.startsWith(LocalObjectStorage.#EXPIRES_PREFIX)) {
                const separatorIndex = value.indexOf("|");
                if (separatorIndex !== -1) {
                    try {
                        const expiresAt = +value.slice(LocalObjectStorage.#EXPIRES_PREFIX.length, separatorIndex);
                        if (Date.now() >= expiresAt) {
                            this.removeItem(key);
                            return fallback ?? null;
                        }
                        value = value.slice(separatorIndex + 1);
                    } catch (e) {
                        console.error(`LocalObjectStorage can't parse expires prefix of key "${key}", removing item...`, e);
                        this.removeItem(key);
                        return fallback ?? null;
                    }
                }
            }
            for (const { type, decode } of builtinTransformations.concat(LocalObjectStorage.plugins.transformations.list)) {
                if (type.includes("|")) {
                    console.error(`LocalObjectStorage can't accept type name "${type}" including "|", skip...`);
                    continue;
                }
                if (type === "JSON") {
                    console.error(`LocalObjectStorage can't accept type name "${type}" from custom transformations, skip...`);
                    continue;
                }
                if (value.startsWith(`${type}|`)) {
                    try {
                        return decode(value.replace(`${type}|`, ""));
                    } catch (_e) {
                        console.error(`LocalObjectStorage can's transform value of key "${key}" to type "${type}" and skip...`);
                    }
                }
            }
            try {
                return JSON.parse(value.replace("JSON|", ""));
            } catch (e) {
                console.error(`LocalObjectStorage can's transform value of key "${key}" to JSON and return \`undefined\`...`, e);
                return undefined;
            }
        }
        setItem(key, value, { expires } = {}) {
            for (const { type, match, encode } of builtinTransformations.concat(LocalObjectStorage.plugins.transformations.list)) {
                if (type.includes("|")) {
                    console.error(`LocalObjectStorage can't accept type name "${type}" including "|", skip...`);
                    continue;
                }
                if (type === "JSON") {
                    console.error(`LocalObjectStorage can't accept type name "${type}", skip...`);
                    continue;
                }
                if (match(value)) {
                    try {
                        localStorage.setItem(`${this.#keyPrefix}${key}`, `${this.#calcExpiresAtPrefix(expires)}${type}|${encode(value)}`);
                        return;
                    } catch (e) {
                        console.error(`LocalObjectStorage can's transform value of key "${key}" from type "${type}" and skip...`, e);
                    }
                }
            }
            try {
                localStorage.setItem(`${this.#keyPrefix}${key}`, `${this.#calcExpiresAtPrefix(expires)}JSON|${JSON.stringify(value)}`);
                return;
            } catch (e) {
                console.error(`LocalObjectStorage can's transform value of key "${key}" from JSON and skip...`, e);
            }
        }
        removeItem(key) {
            localStorage.removeItem(`${this.#keyPrefix}${key}`);
        }
        clear() {
            this.#getAllKeys().forEach((key) => {
                localStorage.removeItem(key);
            });
        }
        key(index) {
            return this.#getAllKeys()[index];
        }
    }
    window.LocalObjectStorage = LocalObjectStorage;
})();
