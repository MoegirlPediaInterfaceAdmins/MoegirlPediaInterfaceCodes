import type { CatALotPrefsInput } from "./types.ts";

declare module "*.css";

declare global {
    interface Window {
        CatALotPrefs?: CatALotPrefsInput;
    }
}

export {};
