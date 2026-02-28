class LibRequestAnimationFrame {
    #handle: ReturnType<typeof window.requestAnimationFrame> | null;
    #actions: Set<FrameRequestCallback>;
    request: typeof window.requestAnimationFrame;
    cancel(): void;
}
declare const libRequestAnimationFrame: {
    LibRequestAnimationFrame: typeof LibRequestAnimationFrame;
    requestAnimationFrameOnce: typeof window.requestAnimationFrame;
};
