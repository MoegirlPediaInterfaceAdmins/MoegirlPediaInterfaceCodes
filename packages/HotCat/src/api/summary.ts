import { HC } from "../config/hotcat.ts";
import { site, state } from "../runtime.ts";
import { substitute } from "../util/text.ts";
import { changeCategory } from "../wikitext/change.ts";
import type { ChangeResult, CommitForm, FailureHandler } from "../types.ts";
import { CategoryEditor } from "../ui/editor.ts";

const requireCommitForm = (): CommitForm => {
    const form = state.commitForm;
    if (!form) {
        // 表单尚未建立
        throw new Error("HotCat: commit form is not initialized");
    }
    return form;
};

/** 多分类改动时把模板文案转成复数形式（中文只有一种形态） */
const multiChangeMsg = (count: number): string => {
    const raw = HC.messages.multi_change;
    const msg = typeof raw === "string" ? raw : mw.language.convertPlural(count, raw);
    return substitute(msg, { 1: `${count}` });
};

/** UTC `YYYYMMDDHHmmss` */
const currentTimestamp = (): string => {
    const now = new Date();
    let ts = `${now.getUTCFullYear()}`;
    const two = (s: string): string => s.substring(s.length - 2);
    ts += two(`0${now.getUTCMonth() + 1}`) + two(`0${now.getUTCDate()}`) + two(`00${now.getUTCHours()}`) + two(`00${now.getUTCMinutes()}`) + two(`00${now.getUTCSeconds()}`);
    return ts;
};

/**
 * 把改动写入隐藏表单并触发提交。
 *
 * @param failure 失败回调
 * @param singleEditor 单编辑器提交；省略时提交全部
 */
const performChanges = (failure: FailureHandler, singleEditor?: CategoryEditor): void => {
    const pageText = state.pageText;
    if (pageText === null) {
        failure(HC.messages.multi_error);
        return;
    }
    if (!HC.messages.cat_keychange.includes("$2")) {
        HC.messages.cat_keychange += '"$2"';
    }
    if (!HC.messages.short_catchange) {
        HC.messages.short_catchange = `[[${HC.category_canonical}:$1]]`;
    }
    const commitForm = requireCommitForm();
    let action: HTMLInputElement | undefined;
    const selfEditConflict = Boolean((state.lastRevId !== null && state.lastRevId !== site.conf.wgCurRevisionId || state.pageTextRevId !== null && state.pageTextRevId !== site.conf.wgCurRevisionId) && state.conflictingUser && state.conflictingUser === site.conf.wgUserName);
    if (singleEditor && !singleEditor.noCommit && !HC.no_autocommit && state.editToken && !selfEditConflict) {
        commitForm.wpEditToken.value = state.editToken;
        action = commitForm.wpDiff;
        action.name = action.value = "wpSave";
        commitForm.wpChangeTags.value += `,${HC.automationChangeTag}`;
    }
    let result: ChangeResult = {
        text: pageText,
        summary: [],
        error: null,
    };
    const changed: { from: string; to: string }[] = [];
    const added: string[] = [];
    const deleted: string[] = [];
    const toEdit = singleEditor ? [singleEditor] : state.editors;
    let changes = 0;
    let error: string | null = null;
    let edit: CategoryEditor;
    let i;
    for (i = 0; i < toEdit.length; i++) {
        edit = toEdit[i];
        if (edit.state === CategoryEditor.CHANGED) {
            result = changeCategory(result.text, edit.originalCategory, edit.currentCategory, edit.currentKey);
            if (!result.error) {
                changes++;
                if (!edit.originalCategory || !edit.originalCategory.length) {
                    added.push(edit.currentCategory);
                } else {
                    changed.push({
                        from: edit.originalCategory,
                        to: edit.currentCategory,
                    });
                }
            } else if (error === null) {
                error = result.error;
            }
        } else if (edit.state === CategoryEditor.DELETED && edit.originalCategory && edit.originalCategory.length) {
            result = changeCategory(result.text, edit.originalCategory, null, null);
            if (!result.error) {
                changes++;
                deleted.push(edit.originalCategory);
            } else if (error === null) {
                error = result.error;
            }
        }
    }
    if (error !== null) {
        action = commitForm.wpSave;
        if (action) {
            action.name = action.value = "wpDiff";
        }
    }
    commitForm.wpMinoredit.checked = state.minorEdits;
    commitForm.wpWatchthis.checked = !site.conf.wgArticleId && state.watchCreate || state.watchEdit || state.pageWatched;
    if (commitForm.wpWatchthis.checked && !state.pageWatched) {
        if (!site.conf.wgArticleId && state.watchCreate) {
            commitForm.wpWatchlistExpiry.value = state.watchCreateExpiry;
        } else {
            commitForm.wpWatchlistExpiry.value = state.watchDefaultExpiry;
        }
    }
    if (site.conf.wgArticleId || singleEditor) {
        if (action && action.value === "wpSave") {
            if (HC.changeTag) {
                commitForm.wpChangeTags.value = `${HC.changeTag},${HC.automationChangeTag}`;
                HC.messages.using = "";
                HC.messages.prefix = "";
            }
        } else {
            commitForm.wpAutoSummary.value = HC.changeTag;
        }
        if (changes === 1) {
            if (result.summary.length) {
                commitForm.wpSummary.value = HC.messages.prefix + result.summary.join(HC.messages.separator) + HC.messages.using;
            }
            commitForm.wpMinoredit.checked = HC.single_minor || state.minorEdits;
        } else if (changes) {
            const summary: string[] = [];
            const shortSummary: string[] = [];
            for (i = 0; i < deleted.length; i++) {
                summary.push(`-${substitute(HC.messages.short_catchange, { 1: deleted[i] })}`);
            }
            if (deleted.length === 1) {
                shortSummary.push(`-${substitute(HC.messages.short_catchange, { 1: deleted[0] })}`);
            } else if (deleted.length) {
                shortSummary.push(`- ${multiChangeMsg(deleted.length)}`);
            }
            for (i = 0; i < added.length; i++) {
                summary.push(`+${substitute(HC.messages.short_catchange, { 1: added[i] })}`);
            }
            if (added.length === 1) {
                shortSummary.push(`+${substitute(HC.messages.short_catchange, { 1: added[0] })}`);
            } else if (added.length) {
                shortSummary.push(`+ ${multiChangeMsg(added.length)}`);
            }
            const arrow = state.is_rtl ? "←" : "→";
            for (i = 0; i < changed.length; i++) {
                if (changed[i].from !== changed[i].to) {
                    summary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[i].from })}${arrow}${substitute(HC.messages.short_catchange, { 1: changed[i].to })}`);
                } else {
                    summary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[i].from })}`);
                }
            }
            if (changed.length === 1) {
                if (changed[0].from !== changed[0].to) {
                    shortSummary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[0].from })}${arrow}${substitute(HC.messages.short_catchange, { 1: changed[0].to })}`);
                } else {
                    shortSummary.push(`±${substitute(HC.messages.short_catchange, { 1: changed[0].from })}`);
                }
            } else if (changed.length) {
                shortSummary.push(`± ${multiChangeMsg(changed.length)}`);
            }
            if (summary.length) {
                let summaryText = summary.join(HC.messages.separator);
                if (summaryText.length > 200 - HC.messages.prefix.length - HC.messages.using.length) {
                    summaryText = shortSummary.join(HC.messages.separator);
                }
                commitForm.wpSummary.value = HC.messages.prefix + summaryText + HC.messages.using;
            }
        }
    }
    commitForm.wpTextbox1.value = result.text;
    commitForm.wpStarttime.value = state.serverTime || currentTimestamp();
    commitForm.wpEdittime.value = state.pageTime || commitForm.wpStarttime.value;
    if (selfEditConflict) {
        commitForm.oldid.value = `${state.pageTextRevId || site.conf.wgCurRevisionId}`;
    }
    commitForm.hcCommit.click();
};

export { multiChangeMsg, currentTimestamp, performChanges };
