import type { MoeUploadConfig } from "@/types";

// 内置唯一配置源（不对站点开放覆盖）：字段与许可按共享站「六栏目」规范
// 作品名或人物名 / 作者二者至少填一项（requiredGroup），其余栏目可选
const DEFAULT_CONFIG: MoeUploadConfig = {
    fields: [
        {
            id: "work",
            label: "作品名或人物名",
            type: "tags",
            requiredGroup: "subject",
            categoryPrefix: "",
            suggest: true,
            placeholder: "输入后回车添加，可多个",
        },
        {
            id: "author",
            label: "作者",
            type: "tags",
            requiredGroup: "subject",
            categoryPrefix: "作者",
            placeholder: "输入后回车添加，可多个",
        },
        {
            id: "source",
            label: "来源",
            type: "text",
            placeholder: "如：官方网站 / 自行截取 / 动画第12话",
        },
        {
            id: "description",
            label: "描述",
            type: "textarea",
            placeholder: "简要描述文件内容、出现场合",
        },
    ],
    // 模板名|显示名；一级条目为分组
    licenses: [
        { id: "CC Zero", label: "CC0", template: "{{CC Zero}}", group: "知识共享" },
        { id: "CC BY", label: "CC BY", template: "{{CC BY}}", group: "知识共享" },
        {
            id: "CC BY-SA",
            label: "CC BY-SA",
            template: "{{CC BY-SA}}",
            group: "知识共享",
        },
        {
            id: "CC BY-NC-SA",
            label: "CC BY-NC-SA",
            template: "{{CC BY-NC-SA}}",
            group: "知识共享",
        },
        {
            id: "PD-Old",
            label: "作者离世一定年限后流入公有领域",
            template: "{{PD-Old}}",
            group: "公有领域",
        },
        {
            id: "PD-Other",
            label: "其他原因流入公有领域",
            template: "{{PD-Other}}",
            group: "公有领域",
        },
        {
            id: "Copyright",
            label: "原作者保留权利（原作者没有明确的授权声明）",
            template: "{{Copyright}}",
            group: "其他",
        },
        {
            id: "Authorized",
            label: "原作者授权萌百使用",
            template: "{{Authorized}}",
            group: "其他",
        },
        {
            id: "可自由使用",
            label: "可自由使用（作者放弃著作权或声明可自由使用）",
            template: "{{可自由使用}}",
            group: "其他",
        },
    ],
    wikitextTemplate: [
        "== 摘要 ==",
        "* 来源：{{{source}}}",
        "{{{description}}}",
        "== 许可协议 ==",
        "{{{license}}}",
    ].join("\n"),
    comment: "使用MoeUpload上传",
    uploadTags: ["MoeUpload"],
    chunkSize: 4 * 1024 * 1024,
    stashThreshold: 4 * 1024 * 1024,
    concurrency: 3,
    maxBatch: 50,
    // 仅图片/音频/视频（旧版批量上传工具的清单去除文档类；比较时统一小写）
    allowedExtensions: [
        "png",
        "gif",
        "jpg",
        "jpeg",
        "webp",
        "svg",
        "jp2",
        "ogg",
        "oga",
        "flac",
        "opus",
        "wav",
        "mp3",
        "ogv",
        "webm",
        "mp4",
    ],
};

const DEFAULT_LICENSE_ID = "Copyright";

export { DEFAULT_CONFIG, DEFAULT_LICENSE_ID };
