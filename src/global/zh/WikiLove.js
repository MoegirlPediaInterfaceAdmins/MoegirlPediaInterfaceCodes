/* 放置于这里的JavaScript定制WikiLove，请见 https://www.mediawiki.org/wiki/Extension:WikiLove#Custom_configuration */
// <nowiki>
"use strict";

$.wikiLoveOptions = {
    ...$.wikiLoveOptions,
    defaultBackgroundColor: "rgba(191,234,181,.2)",
    defaultBorderColor: "rgba(18,152,34,.47)",
};
/*
 * defaultImageSize = "100px";
 * defaultText =
`{| style="background-color: $5; border: 1px solid $6;"
|rowspan="2" style="vertical-align: middle; padding: 5px;" | [[$3|$4]]
|style="font-size: x-large; padding: 3px 3px 0 3px; height: 1.5em;" | '''$2'''
|-
|style="vertical-align: middle; padding: 3px;" | $1 ~~~~
|}`
 */
// 默认星章补充
$.wikiLoveOptions.types.barnstar.subtypes = {
    ...$.wikiLoveOptions.types.barnstar.subtypes,
    userpage: {
        fields: ["message"],
        option: "用户页星章",
        descr: "用户页星章奖励那些用户页设计精美漂亮的萌百人。",
        header: "给您一个星章！",
        title: "用户页星章",
        image: "Userpage_barnstar.png",
    },
    invisible: {
        fields: ["message"],
        option: "隐形星章",
        descr: "隐形星章奖励对萌娘百科作出重要贡献，却一直保持低调的萌百人。",
        header: "给您一个星章！",
        title: "隐形星章",
        image: "Invisible_Barnstar_Hires.png",
    },
    template: {
        fields: ["message"],
        option: "模板星章",
        descr: "模板星章可以用来颁给那些创造或对模板或信息框做出重大改进的萌百人。",
        header: "给您一个星章！",
        title: "模板星章",
        image: "Blueprint_Barnstar.png",
    },
    bravery: {
        fields: ["message"],
        option: "勇气星章",
        descr: "勇气星章可以在任何领域任何行动中表达对捍卫者的勇气的赞许。可以颁发给勇于捍卫真理、表达观点的萌百人。",
        header: "给您一个星章！",
        title: "勇气星章",
        image: "Bravery_Barnstar.jpg",
    },
    helper: {
        fields: ["message"],
        option: "帮手星章",
        descr: "帮手星章送给经常在讨论版回答问题的萌百人。",
        header: "给您一个星章！",
        title: "帮手星章",
        image: "Helping_New_Users_Barnstar_Hires.png",
    },
    neweditor: {
        fields: ["message"],
        option: "优秀新人星章",
        descr: "优秀新人星章送给加入时间不久，但在萌娘百科已有不俗表现和见解的萌百人。",
        header: "给您一个星章！",
        title: "优秀新人星章",
        image: "New_editor_delivery.png",
    },
};
// 增加萌百特色星章
$.wikiLoveOptions.types.mgpSpecial = {
    name: "萌百特色星章",
    icon: "https://storage.moegirl.org.cn/moegirl/commons/6/6f/Moegirlpedia-logo-trim.png!/fw/50",
    subtypes: {
        vup: {
            fields: ["message"],
            option: "VUP星章",
            descr: "VUP星章用于表彰在虚拟UP主专题中有卓越贡献的编辑者。——作者：萌娘百科虚拟UP主编辑团队",
            header: "给您一个星章！",
            title: "VUP星章",
            image: "VUP_Barnstar_Hires.svg",
        },
        umamusume: {
            fields: ["message"],
            option: "特雷森学园的敬业档案管理员",
            descr: "感谢您为特雷森学园档案管理所作出的贡献！我谨代表学园长秋川弥生发放此章以表嘉奖！",
            header: "给您一个星章！",
            title: "特雷森学园的敬业档案管理员",
            text: '{| style="background-color: $5; border: 1px solid $6;\n|rowspan="2" style="vertical-align: middle; padding: 5px;" | [[$3|$4]]\n|style="font-size: x-large; padding: 3px 3px 0 3px; height: 1.5em;" | \'\'\'$2\'\'\'\n|-\n|style="vertical-align: middle; padding: 3px;" | $1 <br/>感谢您为[[特雷森学园]]档案管理所作出的贡献！我谨代表学园长[[秋川弥生]]发放此章以表嘉奖！<br/> ~~~~\n|}',
            image: "赛马娘星章.png",
        },
        inmu: {
            fields: ["message"],
            option: "例区星章",
            descr: "例区星章是颁给对于例区相关条目有显著贡献的编辑者。——作者：風吹けば名無し",
            header: "给您一个星章！",
            title: "例区星章",
            image: "Inmu_Barnstar_Hires.png",
        },
        jia: {
            fields: ["message"],
            option: "甲种勋章",
            descr: "甲种勋章用于表彰在舰队Collection专题中有卓越贡献的编辑者。——作者：User:CFSO6459",
            header: "给您一个星章！",
            title: "甲种勋章",
            image: "甲种勋章.png",
        },
        dongfang1: {
            fields: ["title", "message"],
            option: "文文新闻——天狗报纸大会优胜者",
            descr: "天狗报纸大会优胜者用于表彰在东方Project专题中有卓越贡献的编辑者。——作者：User:宫本美代子",
            header: "给您一个星章！",
            image: "文logo.png",
        },
        dongfang2: {
            fields: ["title", "message"],
            option: "花果子念报——天狗报纸大会优胜者",
            descr: "天狗报纸大会优胜者用于表彰在东方Project专题中有卓越贡献的编辑者。——作者：User:宫本美代子",
            header: "给您一个星章！",
            image: "果logo.png",
        },
        pilgr: {
            fields: ["message"],
            option: "巡回星章",
            descr: "巡回星章用于表彰贡献被作品作者/条目人物巡回的编辑者。——作者：User:宫本美代子",
            header: "给您一个星章！",
            title: "巡回星章",
            image: "Pilgrimage_Barnstar_Hires.png",
        },
        arknights: {
            fields: ["message"],
            option: "罗德岛图书馆萌百分馆干员编辑勋章",
            descr: "罗德岛图书馆萌百分馆干员编辑勋章用于表彰在明日方舟专题中有卓越贡献的编辑者。——作者：User:云霞",
            header: "给您一个星章！",
            title: "罗德岛图书馆萌百分馆干员编辑勋章",
            image: "罗德岛档案室干员编辑勋章.png",
        },
        greyraven: {
            fields: ["message"],
            option: "空中花园萌百资料库勋章",
            descr: "空中花园萌百资料库勋章用于表彰在战双帕弥什专题中有卓越贡献的编辑者。——作者：User:Grandom",
            header: "给您一个星章！",
            title: "空中花园萌百资料库勋章",
            image: "空中花园萌百资料库勋章.png",
        },
        azurlane: {
            fields: ["message"],
            option: "碧蓝航线优秀指挥官星章",
            descr: "碧蓝航线优秀指挥官星章用于表彰在碧蓝航线专题中有卓越贡献的编辑者。——作者：User:本森级7号舰拉菲",
            header: "给您一个星章！",
            title: "碧蓝航线优秀指挥官星章",
            image: "碧蓝航线优秀指挥官星章.png",
        },
        moesuper: {
            fields: ["message"],
            option: "萌之超萌星章",
            descr: "萌之超萌星章用于表彰对于萌与萌属性相关条目有显著贡献的编辑者。——作者:User:Tix",
            header: "给您一个星章！",
            title: "萌之超萌星章",
            image: "萌之超萌星章.png",
        },
        bandori: {
            fields: ["message"],
            option: "Random Star星章",
            descr: "Random Star星章用于表彰在BanG Dream!相关条目有显著贡献的编辑者。",
            header: "给您一把Random Star！",
            title: "Random Star星章",
            image: "Random Star星章.png",
        },
    },
};
// </nowiki>
