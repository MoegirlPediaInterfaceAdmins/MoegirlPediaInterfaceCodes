import type { WatermarkOptions } from "watermark-js-plus/es";

/**
 * 三种水印场景的文案（`multi-line-text` 以 `\n` 分行）。
 */
export const contents: Readonly<Record<"history-revision" | "user-page" | "draft", string>> = {
    "history-revision": "历史版本，非最新内容\n不代表萌娘百科立场",
    "user-page": "用户页面，非正式条目\n不代表萌娘百科立场",
    draft: "草稿页面，内容未经审核\n不代表萌娘百科立场",
};

/**
 * 可见水印参数。视觉基线沿用迁移前 site-js 的自建实现：
 * 300×300 平铺、-15° 旋转、24px 黑字、0.17 透明度。
 * `rotate` 与 `textRowMaxWidth` 必须显式给出——库默认 45° 与自动折行都会改变现有视觉。
 */
export const visibleOptions: Readonly<Partial<WatermarkOptions>> = {
    contentType: "multi-line-text",
    width: 300,
    height: 300,
    rotate: -15,
    fontSize: "24px",
    fontColor: "#000000",
    globalAlpha: 0.17,
    lineHeight: 30,
    textRowMaxWidth: 300,
    zIndex: 2147483647,
    mutationObserve: true,
};

/**
 * MoeSkin 附加层参数。平铺尺寸取 400×400 而非可见层的 300×300：
 * 若两层参数一致，本层文字会逐字叠在可见层文字上（本层像素贡献仅约 3%），
 * 解码增强后只能看到可见层图案；错开平铺尺寸后两层文字网格在画面上分离，各自可辨。
 * `globalAlpha` 与 `mode` 不在此设置——BlindWatermark 构造器对二者强制固定，
 * 传入值会被覆盖（参见其 `super({ ...props, ...defaultProps })`）。
 */
export const auxiliaryOptions: Readonly<Partial<WatermarkOptions>> = {
    contentType: "multi-line-text",
    width: 400,
    height: 400,
    rotate: -15,
    fontSize: "24px",
    fontColor: "#000000",
    mutationObserve: true,
};
