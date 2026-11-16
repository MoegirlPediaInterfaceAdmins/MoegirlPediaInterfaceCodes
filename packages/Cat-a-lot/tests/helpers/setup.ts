import jquery from "jquery";
import { vi } from "vitest";

vi.stubGlobal("$", jquery);
vi.stubGlobal("jQuery", jquery);
vi.stubGlobal("wgULS", (hans: string, hant?: string | null) => hant ?? hans);
