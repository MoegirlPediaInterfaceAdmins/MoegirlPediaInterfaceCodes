import mailmap from "../modules/mailmap.js";

// GitHub API 的 commit.commit.author / committer 类型是 nullable-git-user，其 name / email 也可能缺失，
// 故这里与 isMapped 都对缺值做兜底：缺失时按「未映射」上报，而不是抛 TypeError 让整个检查崩溃。
export const detectIfBot = (name, email) => (name ?? "").endsWith("[bot]") || (email ?? "").split("@")[1] === "github.com";
// mailmap.js 解析时把邮箱键统一转成小写，而 git / GitHub API 返回的邮箱大小写不固定，查询前必须同样归一化。
export const isMapped = (email) => typeof email === "string" && Reflect.has(mailmap, email.toLowerCase());
