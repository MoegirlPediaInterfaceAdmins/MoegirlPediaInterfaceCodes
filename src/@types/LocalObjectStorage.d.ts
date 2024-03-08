interface Transformation {
    type: string;

    match: (arg: any) => boolean;

    encode: (value: any) => string;

    decode: (value: string) => any;
}

declare class LocalObjectStorage {
    static plugins: {
        transformations: {
            get list(): Transformation[];

            add: (transformation: Transformation) => boolean;
        }
    }

    #keyPrefix: string;

    constructor(prefix?: string);

    get _keyPrefix(): string;

    #getAllKeys(): string[];

    getAllKeys(): string[];

    get length(): number;

    getItem(key: string, fallback?: any): any;

    setItem(key: string, value: any): void;

    removeItem(key: string): void;

    clear(): void;

    key(index: number): string | undefined;
}
