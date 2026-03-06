if (!Reflect.has(globalThis, "scheduler")) {
    const yieldViaMessageChannel = (() => {
        const channel = new MessageChannel();
        return () => new Promise((resolve) => {
            channel.port1.onmessage = resolve;
            channel.port2.postMessage(null);
        });
    })();
    globalThis.scheduler = {
        yield: yieldViaMessageChannel,
        postTask: (callback, { delay = 0 } = {}) => setTimeout(callback, delay),
    };
} else if (!Reflect.has(globalThis.scheduler, "yield")) {
    globalThis.scheduler.yield = async () => {
        await globalThis.scheduler.postTask(() => { });
    };
}
