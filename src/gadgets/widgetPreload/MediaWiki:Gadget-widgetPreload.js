"use strict";
$(() => {
    const toUpperFirstCase = (t) => `${`${t[0]}`.substring(0, 1).toUpperCase()}${`${t}`.substring(1)}`;
    if (mw.config.get("wgNamespaceNumber") === 274 && !mw.config.get("wgCurRevisionId")) {
        if (mw.config.get("wgAction") === "edit") {
            const regex = /[-_,./\\]/;
            if (regex.test(mw.config.get("wgPageName"))) {
                window.onbeforeunload = undefined;
                $(window).off("beforeunload");
                location.replace(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?action=edit&title=${mw.config.get("wgPageName").replace(/ |_/g, "").replace(/^([^/]*)[/\\].*$/i, "$1").split(regex).map((n) => {
                    return toUpperFirstCase(n);
                }).join("")}`);
                return;
            }
            const flag = `wg${mw.config.get("wgTitle")}`.replace(/ /g, "");
            $("#wpTextbox1").val(`<noinclude> </noinclude><includeonly><!--{if !isset($${flag}) || !$${flag}}--><!--{assign var="${flag}" value=true scope="global"}--><script>\n"use strict";\nwindow.RLQ = window.RLQ || [];\nwindow.RLQ.push(() => {\n\n});\n</script><!--{/if}--></includeonly>`);
        }
        if ($("#mw-content-text > .mw-parser-output > .noarticletext")[0]) {
            $(document.body).addClass("noWidget");
        }
    }
});