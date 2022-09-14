//<pre>
// remake by [[User:Leranjun]]
"use strict";
$(() => (async () => {
    if (mw.config.get("wgCanonicalSpecialPageName") !== "Contributions") {
        return;
    }
    const target = (document.querySelector('[name="target"]') || {}).value;
    if (typeof target !== "string" || target.length === 0) {
        return;
    }
    const userRights = await mw.user.getRights();
    const isUnderRateLimit = !userRights.includes("noratelimit");
    const isPatrolViewable = userRights.includes("patrol") || userRights.includes("patrolmarks");
    const sleep = (ms = 1000) => new Promise((res) => setTimeout(res, ms));
    const upperFirstCase = (s) => /^[a-z]/.test(s) ? s.substring(0, 1).toUpperCase() + s.substring(1) : s;
    const api = new mw.Api();
    const ns = {
        0: "",
        1: "讨论",
        2: "用户",
        3: "用户讨论",
        4: "萌娘百科",
        5: "萌娘百科讨论",
        6: "文件",
        7: "文件讨论",
        8: "MediaWiki",
        9: "MediaWiki讨论",
        10: "模板",
        11: "模板讨论",
        12: "帮助",
        13: "帮助讨论",
        14: "分类",
        15: "分类讨论",
        274: "Widget",
        275: "Widget_talk",
        710: "Timedtext",
        711: "Timedtext_talk",
        828: "模块",
        829: "模块讨论",
        2300: "Gadget",
        2301: "Gadget_talk",
        2302: "Gadget_definition",
        2303: "Gadget_definition_talk",
    };
    const p = $('<fieldset><legend>用户贡献分布</legend><p id="queryContributions">是否需要加载用户贡献分布（对编辑数量较多的用户慎重使用！）<button id="confirmQueryContributions">确认</button> <button id="cancelQueryContributions">取消</button></p></fieldset>').insertAfter("#mw-content-text > form").find("#queryContributions");
    p.find("#confirmQueryContributions").on("click", async () => {
        p.text(`加载中${isUnderRateLimit ? "（由于您没有“不受速率限制影响”[noratelimit]权限，故本次加载将需要较长时间，请稍等）" : ""}……`);
        const list = await (async () => {
            const result = [];
            const eol = Symbol();
            let uccontinue = undefined;
            while (uccontinue !== eol) {
                const _result = await api.post({
                    action: "query",
                    format: "json",
                    list: "usercontribs",
                    ucuser: target,
                    ucprop: `title|flags${isPatrolViewable ? "|patrolled" : ""}`,
                    uccontinue,
                    uclimit: "max",
                });
                if (_result.continue) {
                    uccontinue = _result.continue.uccontinue;
                    p[0].innerText += "…";
                    if (isUnderRateLimit) {
                        await sleep();
                    }
                } else {
                    uccontinue = eol;
                }
                result.push(..._result.query.usercontribs);
            }
            return result;
        })();
        const nslist = Object.fromEntries(Object.keys(ns).map((key) => [key, { count: 0, patrolled: 0, autopatrolled: 0, "new": 0, distinct: new Set() }]));
        const globalInfo = { patrolled: 0, autopatrolled: 0, "new": 0, distinct: new Set() };
        list.forEach((item) => {
            nslist[item.ns].count++;
            if (Reflect.has(item, "patrolled")) {
                nslist[item.ns].patrolled++;
                globalInfo.patrolled++;
            }
            if (Reflect.has(item, "autopatrolled")) {
                nslist[item.ns].autopatrolled++;
                globalInfo.autopatrolled++;
            }
            if (Reflect.has(item, "new")) {
                nslist[item.ns].new++;
                globalInfo.new++;
            }
            nslist[item.ns].distinct.add(item.title);
            globalInfo.distinct.add(item.title);
        });
        const table = $(`<table class="wikitable sortable"><thead><tr><th>名字空间</th><th>编辑次数</th>${isPatrolViewable ? "<th>被巡查次数</th><th>被手动巡查次数</th>" : ""}<th>不同页面数量</th>><th>创建页面数量</th></tr></thead><tbody></tbody></table>`).find("tbody");
        p.html(`该用户在本站未被删除的编辑共有${list.length}次${isPatrolViewable ? `（其中有${globalInfo.patrolled}次编辑被巡查，${globalInfo.patrolled - globalInfo.autopatrolled}次编辑被手动巡查<sup style="color: blue;">[注：通过api编辑不会自动巡查]</sup>）` : ""}，共编辑${globalInfo.distinct.size}个不同页面，创建了${globalInfo.new}个页面。按名字空间划分如下：`);

        const chartData = [];
        Object.entries(nslist).filter(([, { count }]) => count > 0).sort(([a], [b]) => a - b).forEach(([nsnumber, { count, patrolled, autopatrolled, distinct, "new": newCount }]) => {
            table.append(`<tr><td data-sort-value="${nsnumber}">${+nsnumber === 0 ? "（主名字空间）" : upperFirstCase(ns[+nsnumber])}</td><td>${count}</td>${isPatrolViewable ? `<td>${patrolled}</td><td>${patrolled - autopatrolled}</td>` : ""}<td>${distinct.size}</td><td>${newCount}</td></tr>`);
            chartData.push({ value: count, name: +nsnumber === 0 ? "（主）" : upperFirstCase(ns[+nsnumber]) });
        });
        table.closest("table").insertAfter(p).tablesorter();

        const fieldset = p.closest("fieldset");
        fieldset.append('<button id="toChartQueryContributions">显示饼图</button>');
        fieldset.find("#toChartQueryContributions").on("click", async (e) => {
            $(e.target).remove();
            fieldset.append("<div id=\"contributionChart\" style=\"width: 100%; height: 400px;\">加载中……</div>");
            await $.ajax({
                url: "https://fastly.jsdelivr.net/npm/echarts@5/dist/echarts.min.js",
                dataType: "script",
                crossDomain: true,
                cache: true,
            });
            const chart = echarts.init(document.getElementById("contributionChart"));
            chart.setOption({
                tooltip: {
                    trigger: "item",
                    formatter: "{c} ({d}%)",
                },
                toolbox: {
                    show: true,
                    feature: {
                        saveAsImage: {
                            excludeComponents: ["toolbox"],
                        },
                    },
                },
                legend: {
                    top: "5%",
                    left: "center",
                },
                series: [
                    {
                        name: "用户贡献分布",
                        type: "pie",
                        radius: ["40%", "70%"],
                        avoidLabelOverlap: false,
                        itemStyle: {
                            borderRadius: 10,
                            borderColor: "#fff",
                            borderWidth: 2,
                        },
                        label: {
                            show: false,
                            position: "center",
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: "40",
                                fontWeight: "bold",
                            },
                        },
                        labelLine: {
                            show: false,
                        },
                        data: chartData,
                    },
                ],
            });
            $(window).on("resize", () => chart.trigger("resize"));
        });
    });
    p.find("#cancelQueryContributions").on("click", () => {
        p.closest("fieldset").remove();
    });
})());
//</pre>
