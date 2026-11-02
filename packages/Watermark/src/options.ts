import type { WatermarkOptions } from "watermark-js-plus/es";

/**
 * 水印节点的 z-index，每次页面加载随机取 [1e9, 2^31) 内的整数。
 * 随机化不是为了层级（区间下界已保证盖过页面常规元素），而是让内联样式串不含
 * 固定特征值——index.ts 以此值拼接防护规则的选择器，预写在个人样式表里的规则
 * 无法按固定特征命中水印节点。
 */
export const watermarkZIndex = 1e9 + Math.floor(Math.random() * (2 ** 31 - 1e9));

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
 * 300×300 平铺、逆时针 15° 旋转、24px 黑字、0.17 透明度、文字中心位于图块约 (147, 148)。
 * `rotate` 与 `textRowMaxWidth` 必须显式给出——库默认 45° 与自动折行都会改变现有视觉。
 */
export const visibleOptions: Readonly<Partial<WatermarkOptions>> = {
    contentType: "multi-line-text",
    width: 300,
    height: 300,
    // 库在 initialization 中把角度换算为 (360 - rotate%360)° 后交给 ctx.rotate（canvas 正角为顺时针），
    // 即库的正值产生逆时针倾斜，与 CSS 正值=顺时针的约定相反；迁移前是 CSS rotate(-15deg)（逆时针），
    // 故此处取 15（换算为 345° ≡ -15°），取 -15 会得到方向相反的顺时针倾斜
    rotate: 15,
    fontSize: "24px",
    fontColor: "#000000",
    globalAlpha: 0.17,
    lineHeight: 30,
    textRowMaxWidth: 300,
    // 迁移前文字中心：锚点在 (150, 108)（left:50% / top:36%），但 CSS transform 列表
    // rotate(-15deg) translate(-50%, -50%) 的平移向量随其后的旋转一起转动，实际中心
    // 在约 (147, 148)（300×60 文字块推算为 (147.4, 147.9)；文字块高度在 55–67px 内
    // 中心稳定于 x∈[146.4, 148.0]、y≈148，故取整数）。显式平移会把库的基线默认改为
    // top/left，须一并显式设回 middle/center
    translateX: 147,
    translateY: 148,
    textBaseline: "middle",
    textAlign: "center",
    zIndex: watermarkZIndex,
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
    // 与可见层同为逆时针 15°（库的正值=逆时针，见 visibleOptions.rotate 注释）
    rotate: 15,
    fontSize: "24px",
    // 单通道差值：globalAlpha 0.005 经 canvas 8bit alpha 量化后实际为 1/255，合成公式
    // round((src + 254·bg)/255) 下 src=255 的通道恰好补回损失（差值为 0）、src=0 的
    // 通道恒为 -1。取青色使差值只落在 R 通道（如 #f7f7f9 → #f6f7f9），黑字则是三通道
    // 各 -1 的灰差。解码侧 color-burn 为逐通道二值化（=255 白、<255 黑），本层显影为
    // 青色文字，判别边界与黑字相同
    fontColor: "#00ffff",
    // 与可见层共用同一 z-index：防护规则的选择器以此值拼接，两层节点都要被覆盖；
    // 同值不改变层叠关系（同 z-index 时按 DOM 顺序绘制，与共用库默认值时一致）
    zIndex: watermarkZIndex,
    mutationObserve: true,
};
