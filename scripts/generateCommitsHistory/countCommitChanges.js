import { debugConsole } from "../modules/debugLog.js";
import { renamePathValidator } from "./pathValidators.js";

/**
 * 统计单个提交的 src/ 改动量。
 * 计数与入选必须解耦：changedFiles 会被 Gadget-queryContributions 直接求和成
 * GHIA 编辑数，须保持修复前口径——纯重命名（`0 0 路径`）不计权，否则重命名
 * 密集提交会显著膨胀该统计；但入选判定用 touchedSrc（含纯重命名），否则纯
 * 重命名提交会重新被整体丢弃（#1065 实测漏掉 6 个此类提交），以
 * changedFiles: 0 入库即可两全。
 * binary 条目没有行数（changes 为 undefined），且 simple-git 的 numstat 解析
 * 把 before/after 恒置为 0，无法沿用修复前的 before !== after 判定；而会
 * 出现在 diff 输出里的 binary 文件必然发生过变化，故直接计权。
 * 普通提交走 diff.files；合并提交的 diff 为 null，改用预先算好的
 * 「与所有父提交都不同」的冲突解决产物计数。
 * @param {{ files?: { file: string; changes?: number; binary?: boolean; }[] } | null} diff simple-git 解析出的提交 diff
 * @param {string} hash 提交哈希，用于查 mergeChangedFiles
 * @param {Map<string, number>} mergeChangedFiles 合并提交「与所有父都不同」的文件数
 * @returns {{ changedFiles: number; touchedSrc: boolean; }}
 */
export default (diff, hash, mergeChangedFiles) => {
    let changedFiles = 0;
    let touchedSrc = false;
    if (Array.isArray(diff?.files)) {
        debugConsole.log("\tdiff.files:", diff.files);
        for (const { file, changes, binary } of diff.files) {
            if (!renamePathValidator(file)) {
                continue;
            }
            touchedSrc = true;
            if (binary || changes > 0) {
                changedFiles++;
            }
        }
        debugConsole.log("\tchangedFiles:", changedFiles, "| touchedSrc:", touchedSrc);
    } else if (mergeChangedFiles.has(hash)) {
        // 合并提交：仅计入「与所有父提交都不同」的冲突解决产物
        touchedSrc = true;
        changedFiles = mergeChangedFiles.get(hash);
        debugConsole.log("\tchangedFiles (merge, differing from all parents):", changedFiles);
    } else {
        debugConsole.log("\tNothing changed by this commit.");
    }
    return { changedFiles, touchedSrc };
};
