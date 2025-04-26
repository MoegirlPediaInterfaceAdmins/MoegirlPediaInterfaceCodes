"use strict";
/* JS placed here will affect staffs only */
/* 函数执行体 */
$(() => {
    // 自授权管理员增加更短的时间选项
    if (mw.config.get("wgCanonicalSpecialPageName") === "Userrights") {
        const wpExpiry = document.querySelector("#mw-input-wpExpiry-sysop");
        Array.from(wpExpiry.options).filter((ele) => ele.value === "1 day")[0].before(new Option("30分钟", "30 minutes"), new Option("2小时", "2 hours"), new Option("6小时", "6 hours"));
    }
    // 替换文本默认不勾选「通过Special:最近更改和监视列表通知这些编辑」
    if (mw.config.get("wgCanonicalSpecialPageName") === "ReplaceText" && $("#doAnnounce")[0]) {
        $("#doAnnounce").prop("checked", false);
    }

    // 顶部警告框
    const $staffWarning = $(`
<div
  id="staff-warning"
  class="infoBox"
  style="border-left: 10px solid #c00; width: 100%; margin-bottom: 1rem"
>
  <div class="infoBoxContent" style="background: #fff2de; color: #f00">
    <div class="infoBoxIcon" style="font-size: 40px">⚠️</div>
    <div class="infoBoxText">
      <div style="display: flex; align-items: center">
        <b style="flex: 1; font-size: 1.5rem">
          警告：当前登录的是萌娘百科 STAFF 账号！
        </b>
        <a>我知道了</a>
      </div>
    </div>
  </div>
</div>
    `);
    $("#mw-body").prepend($staffWarning);
    $staffWarning.find("a").on("click", () => {
        $staffWarning.hide(150);
    });
});
