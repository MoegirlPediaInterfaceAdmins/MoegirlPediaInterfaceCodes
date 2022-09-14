// <pre>
"use strict";
(async () => {
    // await mw.loader.using(["ext.gadget.libOOUIDialog"]);
    if (mw.config.get("wgCanonicalSpecialPageName") !== "Block") {
        return;
    }
    await $.ready;
    const showResults = (size, cidr) => {
        $("#mw-checkuser-cidr-res").val(cidr);
        $("#mw-checkuser-ipnote").text(size);
    };
    const updateCIDRresult = () => {
        const form = document.getElementById("mw-checkuser-cidrform");
        if (!form) {
            return;
        }
        form.style.display = "inline";
        const iplist = document.getElementById("mw-checkuser-iplist")/*  as HTMLTextAreaElement */;
        if (!iplist) {
            return;
        }
        const text = iplist.value;
        let ips;
        if (text.indexOf("\n") !== -1) {
            ips = text.split("\n");
        } else if (text.indexOf("\t") !== -1) {
            ips = text.split("\t");
        } else if (text.indexOf(",") !== -1) {
            ips = text.split(",");
        } else if (text.indexOf(" - ") !== -1) {
            ips = text.split(" - ");
        } else if (text.indexOf("-") !== -1) {
            ips = text.split("-");
        } else if (text.indexOf(" ") !== -1) {
            ips = text.split(" ");
        } else {
            ips = text.split(";");
        }
        let binPrefix = 0/*  as any */, prefixCidr = 0/*  as any */, prefix = "", foundV4 = false, foundV6 = false, ipCount, blocs, isOverflow;
        for (let i = 0; i < ips.length; i++) {
            const addy = ips[i].replace(/^\s*|\s*$/, "");
            const ipV4 = mw.util.isIPv4Address(addy, true);
            const ipV6 = mw.util.isIPv6Address(addy, true);
            const ipCidr = addy.match(/^(.*)(?:\/(\d+))?$/);
            let bin = "";
            let x = 0, z = 0, start = 0, end = 0, ip, cidr, bloc, binBlock;
            if (ipV4) {
                foundV4 = !0;
                if (foundV6) {
                    prefix = "";
                    break;
                }
                ip = ipCidr[1];
                cidr = ipCidr[2] ? ipCidr[2] : null;
                blocs = ip.split(".");
                for (x = 0; x < blocs.length; x++) {
                    bloc = parseInt(blocs[x], 10);
                    binBlock = bloc.toString(2);
                    while (binBlock.length < 8) {
                        binBlock = `0${binBlock}`;
                    }
                    bin += binBlock;
                }
                prefix = "";
                if (cidr) {
                    bin = bin.substring(0, cidr);
                }
                if (binPrefix === 0) {
                    binPrefix = bin;
                } else {
                    for (x = 0; x < binPrefix.length; x++) {
                        if (bin[x] === undefined || binPrefix[x] !== bin[x]) {
                            binPrefix = binPrefix.substring(0, x);
                            break;
                        }
                    }
                }
                prefixCidr = binPrefix.length;
                if (prefixCidr < 16) {
                    isOverflow = true;
                }
                for (z = 0; z <= 3; z++) {
                    bloc = 0;
                    start = z * 8;
                    end = start + 7;
                    for (x = start; x <= end; x++) {
                        if (binPrefix[x] === undefined) {
                            break;
                        }
                        bloc += parseInt(binPrefix[x], 10) * 2 ** (end - x);
                    }
                    prefix += z === 3 ? bloc : `${bloc}.`;
                }
                ipCount = 2 ** (32 - prefixCidr);
                if (prefixCidr === 32) {
                    prefixCidr = !1;
                }
            } else if (ipV6) {
                foundV6 = !0;
                if (foundV4) {
                    prefix = "";
                    break;
                }
                ip = ipCidr[1];
                cidr = ipCidr[2] ? ipCidr[2] : null;
                const abbrevs = ip.match(/::/g);
                if (abbrevs && abbrevs.length > 0) {
                    const colons = ip.match(/:/g);
                    let needed = 7 - (colons.length - 2);
                    let insert = "";
                    while (needed > 1) {
                        insert += ":0";
                        needed--;
                    }
                    ip = ip.replace("::", `${insert}:`);
                    if (ip[0] === ":") {
                        ip = `0${ip}`;
                    }
                }
                blocs = ip.split(":");
                for (x = 0; x <= 7; x++) {
                    bloc = blocs[x] ? blocs[x] : "0";
                    const intBlock = parseInt(bloc, 16);
                    binBlock = intBlock.toString(2);
                    while (binBlock.length < 16) {
                        binBlock = `0${binBlock}`;
                    }
                    bin += binBlock;
                }
                prefix = "";
                if (cidr) {
                    bin = bin.substring(0, cidr);
                }
                if (binPrefix === 0) {
                    binPrefix = bin;
                } else {
                    for (x = 0; x < binPrefix.length; x++) {
                        if (bin[x] === undefined || binPrefix[x] !== bin[x]) {
                            binPrefix = binPrefix.substring(0, x);
                            break;
                        }
                    }
                }
                prefixCidr = binPrefix.length;
                if (prefixCidr < 32) {
                    isOverflow = true;
                }
                for (z = 0; z <= 7; z++) {
                    bloc = 0;
                    start = z * 16;
                    end = start + 15;
                    for (x = start; x <= end; x++) {
                        if (binPrefix[x] === undefined) {
                            break;
                        }
                        bloc += parseInt(binPrefix[x], 10) * 2 ** (end - x);
                    }
                    bloc = bloc.toString(16);
                    prefix += z === 7 ? bloc : `${bloc}:`;
                }
                ipCount = 2 ** (128 - prefixCidr);
                if (prefixCidr === 128) {
                    prefixCidr = !1;
                }
            }
        }
        if (prefix !== "") {
            let full = prefix;
            if (prefixCidr !== false) {
                full += `/${prefixCidr}`;
            }
            showResults(`~${ipCount}${isOverflow ? " [OVERFLOW]" : ""}`, full);
        } else {
            showResults("?", "");
        }
    };
    $("#mw-content-text form").prepend('<fieldset id="mw-checkuser-cidrform" class="checkuser-show" style="display: block; float: right;"><legend>检查指定IP列表的共同区段</legend><textarea id="mw-checkuser-iplist" dir="ltr" rows="5" cols="50"></textarea><br>通用CIDR：&nbsp;<input name="mw-checkuser-cidr-res" size="35" value="" id="mw-checkuser-cidr-res">&nbsp;<strong id="mw-checkuser-ipnote">?</strong></fieldset><style>#mw-content-text form .oo-ui-fieldLayout:before, #mw-content-text form .oo-ui-fieldLayout:after {clear: left;}');
    updateCIDRresult();
    $("#mw-checkuser-iplist").on("keyup click", updateCIDRresult);

    const autoBlock = OO.ui.infuse($("#mw-input-wpAutoBlock"));
    if ($("input#mw-input-wpConfirm, input[name=wpConfirm]").val() === "") {
        autoBlock.setSelected(false);
    }
    if (mw.config.get("wgUserGroups").includes("patroller")) {
        autoBlock.setDisabled(true);
    }

    let flag = false;
    const wpTarget = $('[name="wpTarget"]');
    let powerfulUserList = [];
    const submitButton = OO.ui.infuse($('#mw-content-text [type="submit"]').parent());
    const submitForm = submitButton.$element.closest("form");
    const submitButtonText = submitButton.getLabel();
    submitButton.setDisabled(true).setLabel(wgULS("正在加载中……", "正在載入中……"));
    submitForm.on("submit.warning", async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (flag === false) {
            // powerfulUserList has not been loaded yet
            return;
        }
        if (powerfulUserList.includes(wpTarget.val()) && !await oouiDialog.confirm(`您要${wgULS("封禁的用户", "封鎖的使用者", null, null, "封鎖的用戶")}【${wpTarget.val()}】${wgULS("持有“封禁”和“自我解封”权限，您的封禁很可能无效且有可能违反封禁方针，您是否要继续？", "持有「封鎖」和「自我解封」權限，您的封鎖很可能無效且有可能違反封鎖方針，您是否要繼續？")}`, {
            title: wgULS("封禁辅助工具", "封鎖輔助工具"),
        })) {
            // User cancelled the action
            return;
        }
        submitForm.off("submit.warning").trigger("submit");
    });
    try {
        const result = await new mw.Api({
            timeout: 5000,
        }).post({
            action: "query",
            list: "allusers",
            aurights: "block|unblockself",
            aulimit: "max",
            auprop: "rights",
        });
        powerfulUserList = result.query.allusers.filter((au) => au.rights.includes("block") && au.rights.includes("unblockself")).map((au) => au.name);
    } catch (error) {
        console.error(error);
        submitButton.after(`<span class="error">${wgULS("无法获取持有“封禁”和“自我解封”权限的用户列表，请谨慎操作", "無法獲取持有「封鎖」和「自我解封」權限的使用者列表，請謹慎操作", null, null, "無法獲取持有「封鎖」和「自我解封」權限的用戶列表，請謹慎操作")}。</span>`);
    } finally {
        submitButton.setDisabled(false).setLabel(submitButtonText);
        flag = true;
    }
})();
// </pre>
