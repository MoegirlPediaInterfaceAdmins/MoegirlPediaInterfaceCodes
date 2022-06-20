$(function(){
    if (document.getElementById("wpSave")) {
        mw.util.addPortletLink("p-cactions", "https://commons.moegirl.org.cn/MediaWiki:Uploader", wgULS("上传文件", "上傳檔案", null, null, "上載檔案"), "btn-fileUploader", "批量上传文件");
    }
    if (mw.config.get("skin") == "moeskin") {
        MOE_SKIN_GLOBAL_DATA_REF.value.nav_urls.uploader = {
            text: wgULS("批量上传文件", "批量上傳檔案", null, null, "批量上載檔案"),
            id: "t-uploader",
            href: "https://commons.moegirl.org.cn/MediaWiki:Uploader",
            title: "批量上传文件"
        }
    } else {
        mw.util.addPortletLink("p-tb", "https://commons.moegirl.org.cn/MediaWiki:Uploader", wgULS("批量上传文件", "批量上傳檔案", null, null, "批量上載檔案"), "t-uploader", "批量上传文件", null, "#t-specialpages");
    }
});