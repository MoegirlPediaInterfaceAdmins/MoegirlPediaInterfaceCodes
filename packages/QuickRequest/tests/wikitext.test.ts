import { describe, expect, it } from "vitest";
import type { TemplateSpec, TypeConfig } from "../src/types.ts";
import { buildSubmitText, buildTemplateWikitext, toSubst } from "../src/wikitext.ts";

const editType: TemplateSpec & Pick<TypeConfig, "requireAnyOf"> = {
    template: "Template:编辑请求",
    requireAnyOf: ["original", "new"],
    parameters: [
        { key: "original", label: "需要删除/修改的旧内容", type: "multiline" },
        { key: "new", label: "需要新增/修改后的内容", type: "multiline" },
        { key: "reason", label: "修改原因", type: "text" },
    ],
};

const botVariant: TemplateSpec = {
    template: "Template:权限申请/机器人申请",
    fixedParams: { 用户组: "机器人", 追加任务: "false" },
    parameters: [
        { key: "1", label: "机器人账户名", type: "user", required: true },
        { key: "2", label: "申请理由", type: "multiline", required: true },
    ],
};

describe("buildTemplateWikitext", () => {
    it("按参数定义顺序拼接，空值整段省略", () => {
        expect(buildTemplateWikitext(editType, { original: "旧", "new": "", reason: "原因" })).toBe("{{Template:编辑请求|original=旧|reason=原因}}");
    });

    it("全部为空时只输出模板调用骨架", () => {
        expect(buildTemplateWikitext(editType, {})).toBe("{{Template:编辑请求}}");
    });

    it("值里不存在的参数键不会混入", () => {
        expect(buildTemplateWikitext(editType, { original: "旧", other: "多余" })).toBe("{{Template:编辑请求|original=旧}}");
    });

    it("没有参数定义时只输出模板名", () => {
        expect(buildTemplateWikitext({ template: "Template:X" }, { 1: "a" })).toBe("{{Template:X}}");
    });
});

describe("值中的管道", () => {
    it("值一律原样拼接，顶层管道不做转义（预览为强制步骤，拆参异常在预览可见；不改动用户输入）", () => {
        expect(buildTemplateWikitext(editType, { original: "A|new=B", "new": "", reason: "" })).toBe("{{Template:编辑请求|original=A|new=B}}");
    });

    it("嵌套模板与内链里的管道保持原样", () => {
        expect(buildTemplateWikitext(editType, { original: "{{模板|参数}} 和 [[目标页|显示文字]]", "new": "", reason: "" }))
            .toBe("{{Template:编辑请求|original={{模板|参数}} 和 [[目标页|显示文字]]}}");
    });
});

describe("固定参数（fixedParams）", () => {
    it("固定参数先于用户参数输出", () => {
        expect(buildTemplateWikitext(botVariant, { 1: "Example-bot", 2: "理由" }))
            .toBe("{{Template:权限申请/机器人申请|用户组=机器人|追加任务=false|1=Example-bot|2=理由}}");
    });

    it("用户参数全空时只输出模板与固定参数——空表单的判空基线由此得出", () => {
        expect(buildTemplateWikitext(botVariant, {}))
            .toBe("{{Template:权限申请/机器人申请|用户组=机器人|追加任务=false}}");
    });

    it("固定参数值原样输出（不做管道转义）", () => {
        expect(buildTemplateWikitext({ template: "T", fixedParams: { k: "a|b" } }, {})).toBe("{{T|k=a|b}}");
    });
});

describe("封禁信息（banAppeal）", () => {
    const banAppealSpec: TemplateSpec = {
        template: "Template:BlockedUserHelp/request",
        parameters: [
            { key: "1", label: "封禁信息", type: "multiline", readOnly: true },
            { key: "reason", label: "求助理由", type: "multiline" },
        ],
    };

    it("封禁信息里的内链管道保持原样，多行文本不拆散参数", () => {
        const blockInfo = "该用户已被封禁，执行封禁的人员是[[U:示例管理员|示例管理员]]。封禁原因是：''理由''。\n* 封禁开始时间：2026年10月23日 (五) 21:37\n* 封禁期满时间：无限期\n* 封禁编号：#13390";
        expect(buildTemplateWikitext(banAppealSpec, { 1: blockInfo, reason: "" }))
            .toBe(`{{Template:BlockedUserHelp/request|1=${blockInfo}}}`);
    });
});

describe("toSubst", () => {
    it("只改写字符串开头的模板调用", () => {
        expect(toSubst("{{T|1=a}}")).toBe("{{subst:T|1=a}}");
    });

    it("不在开头的模板调用保持原样", () => {
        expect(toSubst("前言{{T}}")).toBe("前言{{T}}");
    });
});

describe("buildSubmitText", () => {
    it("施加 subst 改写且不追加签名（签名由模板的 sign 参数缺省值完成）", () => {
        expect(buildSubmitText("{{Template:编辑请求|original=旧}}")).toBe("{{subst:Template:编辑请求|original=旧}}");
    });
});
