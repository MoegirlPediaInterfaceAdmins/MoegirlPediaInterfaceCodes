"use strict";
$(() => {
    if (document.getElementById("wpSave")) {
        mw.util.addPortletLink("p-cactions", "https://commons.moegirl.org.cn/MediaWiki:Uploader", wgULS("上传文件", "上傳檔案", null, null, "上載檔案"), "btn-fileUploader", "批量上传文件");
    }
    mw.util.addPortletLink("p-tb", "https://commons.moegirl.org.cn/MediaWiki:Uploader", wgULS("批量上传文件", "批次上傳檔案", null, null, "批次上載檔案"), "t-uploader", "批量上传文件", null, "#t-specialpages");
});
