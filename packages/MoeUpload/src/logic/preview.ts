const IMAGE_EXTENSIONS = new Set([
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
    "avif",
]);

// 仅 http(s)、按 pathname 扩展名判定，忽略 query/hash
const isImageUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }
        const extension = parsed.pathname.split(".").pop() ?? "";
        return IMAGE_EXTENSIONS.has(extension.toLowerCase());
    } catch {
        return false;
    }
};

export { isImageUrl };
