interface Transformer {
    type: string;

    match: (arg: any) => boolean;

    encode: (value: any) => string;

    decode: (value: string) => any;
}

type LocalObjectStorageExpires = [amount: number, unit: moment.unitOfTime.DurationConstructor];

interface LocalObjectStorageOptions {
    expires?: LocalObjectStorageExpires;
}

interface LocalObjectStorageSetItemOptions {
    expires?: LocalObjectStorageExpires;
}

declare class LocalObjectStorage {
    static plugins: {
        transformers: {
            get list(): Transformer[];

            add: (transformer: Transformer) => boolean;
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

    setItem<T = any>(key: string, value: T, options?: LocalObjectStorageSetItemOptions): void;

    removeItem(key: string): void;

    clear(): void;

    key(index: number): string | undefined;
}
