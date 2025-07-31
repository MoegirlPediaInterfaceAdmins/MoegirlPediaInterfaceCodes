"use strict";
window.libDiscussionUtil = {
    getDiscussionHeader: (filterClassess = []) => [...document.querySelectorAll("#mw-content-text > .mw-parser-output > h2, #mw-content-text > .mw-parser-output > .discussionContainer > h2, #mw-content-text > .mw-parser-output > .mw-heading2")].map((ele) => {
        const self = $(ele);
        const content = self.nextUntil("h2, .mw-heading2").not("h2, .mw-heading2");
        for (const filterClass of filterClassess) {
            if (content.hasClass(filterClass)) {
                return null;
            }
        }
        const sectionTitle = self.find(".mw-headline, h2[data-mw-thread-id]").attr("id");
        return { self, sectionTitle };
    }).filter((n) => n !== null),
};
