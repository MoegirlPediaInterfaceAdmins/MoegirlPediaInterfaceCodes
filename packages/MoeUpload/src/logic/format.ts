// 可读字节数（1024 进制；非法值与非正值为 '0 B'）
const formatSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 B";
    }
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
        return `${Math.round(bytes / 1024)} KB`;
    }
    return `${Math.round(bytes)} B`;
};

export { formatSize };
