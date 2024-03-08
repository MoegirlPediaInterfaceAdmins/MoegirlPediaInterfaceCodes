interface Transformation {
    type: string;

    match: (any) => boolean;

    encode: (any) => string;

    decode: (any) => any;
}

declare class LocalObjectStorage {
    static plugins: {
        transformations: {
            get list(): Transformation[];

            add: (transformation: Transformation) => boolean;
        }
    }

    private #keyPrefix: string;

    constructor(prefix?: string);

    get _keyPrefix(): string;

    private #getAllKeys(): string[];

    getAllKeys(): string[];

    get length(): number;

    getItem(key: string, fallback?: any): any;

    setItem(key: string, value: any): void;

    removeItem(key: string): void;

    clear(): void;

    key(index: number): string | undefined;
}
