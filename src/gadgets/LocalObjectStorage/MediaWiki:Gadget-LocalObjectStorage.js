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
    class LocalObjectStorage {
        constructor(prefix = "") {
            if (prefix === "default") {
                throw new Error(`LocalObjectStorage can't accept prefix "${prefix}".`);
            }
            if (prefix.includes("/")) {
                throw new Error(`LocalObjectStorage can't accept prefix "${prefix}" including "/".`);
            }
            this._keyPrefix = `AnnTool-localObjectStorage/${prefix?.length > 0 ? `${prefix}/` : "default/"}`;
        }
        _getAllKeys() {
            return Object.keys(localStorage).filter((key) => key.startsWith(this._keyPrefix));
        }
        get length() {
            return this._getAllKeys().length;
        }
        getItem(key, fallback) {
            const value = localStorage.getItem(`${this._keyPrefix}${key}`);
            if (value === null) {
                return fallback || value;
            }
            for (const { type, decode } of builtinTransformations.concat(LocalObjectStorage.plugins.transformations.list)) {
                if (type.includes("|")) {
                    console.error(`LocalObjectStorage can't accept type name "${type}" including "|", skip...`);
                    continue;
                }
                if (type === "JSON") {
                    console.error(`LocalObjectStorage can't accept type name "${type}", skip...`);
                    continue;
                }
                if (value.startsWith(`${type}|`)) {
                    try {
                        return decode(value.replace(`${type}|`, ""));
                    } catch (e) {
                        console.error(`LocalObjectStorage can's transform value of key "${key}" to type "${type}" and skip...`);
                    }
                }
            }
            try {
                return JSON.parse(value.replace("JSON|", ""));
            } catch (e) {
                console.error(`LocalObjectStorage can's transform value of key "${key}" to JSON and return raw value...`);
                return value;
            }
        }
        setItem(key, value) {
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
                        localStorage.setItem(`${this._keyPrefix}${key}`, `${type}|${encode(value)}`);
                        return;
                    } catch (e) {
                        console.error(`LocalObjectStorage can's transform value of key "${key}" from type "${type}" and skip...`);
                    }
                }
            }
            try {
                localStorage.setItem(`${this._keyPrefix}${key}`, `JSON|${JSON.stringify(value)}`);
                return;
            } catch (e) {
                console.error(`LocalObjectStorage can's transform value of key "${key}" from JSON and store raw value...`);
                localStorage.setItem(`${this._keyPrefix}${key}`, value);
            }
        }
        removeItem(key) {
            localStorage.removeItem(`${this._keyPrefix}${key}`);
        }
        clear() {
            this._getAllKeys().forEach((key) => {
                localStorage.removeItem(key);
            });
            this.length = 0;
        }
        key(index) {
            return this._getAllKeys()[index];
        }
    }
    const externalTransformations = [];
    LocalObjectStorage.plugins = {
        transformations: {
            get list() {
                return externalTransformations;
            },
            add({ type, match, decode, encode }) {
                if (type.includes("|")) {
                    console.error(`LocalObjectStorage can't accept type name "${type}" including "|", skip...`);
                    return false;
                }
                if (type === "JSON") {
                    console.error(`LocalObjectStorage can't accept type name "${type}", skip...`);
                    return false;
                }
                if (builtinTransformations.concat(LocalObjectStorage.plugins.transformations.list).filter(({ type: eType }) => eType === type).length > 0) {
                    console.error(`LocalObjectStorage can't accept duplicated type name "${type}", skip...`);
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
    window.LocalObjectStorage = LocalObjectStorage;
})();