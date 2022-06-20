"use strict";
// <pre>
$(() => {
    if ($(".mw-editsection")[0] && !$("#template-documentation, .template-documentation")[0]) {
        $("#ca-edit").after(`<li id="ca-editTopSection"><span class="mw-editsection"><a href="${ $("#ca-edit a").attr("href") }&section=0" title="编辑本页序言">编辑序言</a><span class="mw-editsection-bracket"></span></span></li>`);
    }
});
// </pre>