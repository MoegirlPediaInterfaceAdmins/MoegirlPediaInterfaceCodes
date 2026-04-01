const fetchUserAgentPatchFlag = Symbol.for("MoegirlPediaInterfaceCodes.fetchUserAgentPatched");
const userAgent = process.env.ANNBOT_USER_AGENT?.trim();

if (typeof globalThis.fetch === "function" && userAgent && !globalThis[fetchUserAgentPatchFlag]) {
    const originalFetch = globalThis.fetch.bind(globalThis);

    globalThis.fetch = (input, init) => {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        if (init?.headers) {
            new Headers(init.headers).forEach((value, key) => {
                headers.set(key, value);
            });
        }
        headers.set("user-agent", `MoegirlPediaInterfaceCodes ${userAgent}`);
        return originalFetch(input, {
            ...init,
            headers,
        });
    };

    globalThis[fetchUserAgentPatchFlag] = true;
}
