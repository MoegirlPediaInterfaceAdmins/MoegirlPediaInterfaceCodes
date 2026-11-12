export interface FieldOption {
    label: string;
    value: string;
}

export interface FieldSchema {
    id: string;
    label: string;
    // tags = 多值标签输入（meta 以「、」连接存储）；category = 单值分类，值不带前缀
    type: "text" | "textarea" | "select" | "tags" | "category";
    required?: boolean;
    // 同组至少填一项（组 id 任意）
    requiredGroup?: string;
    suggest?: boolean;
    // 键存在（可为空串）即派生分类；空串=无前缀。必须用 'in' 判断，勿用真值
    categoryPrefix?: string;
    placeholder?: string;
    options?: FieldOption[];
    defaultValue?: string;
}

export interface LicenseDef {
    id: string;
    label: string;
    template: string;
    group?: string;
}

export interface MoeUploadConfig {
    fields: FieldSchema[];
    licenses: LicenseDef[];
    wikitextTemplate: string;
    comment: string;
    // 站点需已在 Special:Tags 定义；留空不附加
    uploadTags: string[];
    // 分块大小（字节）
    chunkSize: number;
    // 超过该大小（字节）走分块
    stashThreshold: number;
    concurrency: number;
    maxBatch: number;
    // 小写、不含点；本地文件入队校验，URL 不校验
    allowedExtensions: string[];
}

export type ItemStatus
    = | "pending"
        | "checking"
        | "ready"
        | "uploading"
    // 已暂存（拿到 filekey），等待提交
        | "staged"
        | "submitting"
        | "done"
    // 已进入站点审核队列（moderation 接管）的终态，审核通过后正式发布
        | "queued"
    // 失败可重试；含服务器 warnings（红色文字展示在条目上）
        | "failed";

export interface UploadResult {
    title: string;
    descriptionurl?: string;
}

export interface QueueItem {
    id: string;
    kind: "file" | "url";
    file?: File;
    url?: string;
    name: string;
    size: number;
    // 本地缩略图 objectURL（仅本地图片）
    thumbUrl?: string;
    status: ItemStatus;
    filekey?: string;
    // 文件名锁定、不带 text
    reupload?: boolean;
    // 用户点「覆盖上传」后提交时带 ignorewarnings
    ignoreWarnings: boolean;
    error?: string;
    meta: Record<string, string>;
    licenseId: string;
    categories: string[];
    result?: UploadResult;
}

export interface Session {
    canUpload: boolean;
    canUploadByUrl: boolean;
    // 站点单文件上限（字节），0 表示未知/不限
    maxUploadSize: number;
}
