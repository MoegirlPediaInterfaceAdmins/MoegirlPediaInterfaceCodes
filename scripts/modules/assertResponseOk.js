/**
 * fetch 响应状态检查：非 2xx 时抛错，消息带状态码与状态文本，响应正文挂在 cause 上。
 * @param {Response} response
 * @param {string} label 错误消息前缀，如 "[Gadget-xxx] Failed to fetch file from jsDelivr"
 */
export default async (response, label) => {
    if (!response.ok) {
        throw new Error(`${label}: ${response.status} ${response.statusText}`, { cause: await response.text() });
    }
};
