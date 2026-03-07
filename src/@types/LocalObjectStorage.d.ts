import type { DurationInputArg2 } from "moment";

interface Transformation {
    type: string;

    match: (arg: any) => boolean;

    encode: (value: any) => string;

    decode: (value: string) => any;
}

interface LocalObjectStorageOptions {
    expires?: [amount: number, unit: DurationInputArg2];
}

declare class LocalObjectStorage {
    static plugins: {
        transformations: {
            get list(): Transformation[];

            add: (transformation: Transformation) => boolean;
        }
    }

    #keyPrefix: string;

    #expires?: LocalObjectStorageOptions["expires"];

    constructor(prefix?: string, options?: LocalObjectStorageOptions);

    get _keyPrefix(): string;

    #getAllKeys(): string[];

    getAllKeys(): string[];

    get length(): number;

    getItem<T = any>(key: string): T | string | null;

    getItem<T = any>(key: string, fallback: T): T;

    setItem<T = any>(key: string, value: T): void;

    removeItem(key: string): void;

    clear(): void;

    key(index: number): string | undefined;
}
