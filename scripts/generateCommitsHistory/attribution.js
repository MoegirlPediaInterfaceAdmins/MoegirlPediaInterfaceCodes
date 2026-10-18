import mailmap from "../modules/mailmap.js";

const githubWebInterfaceCommitter = {
    committerName: "GitHub",
    committerEmail: "noreply@github.com",
};

/**
 * 判定「提交是否来自 GitHub 网页界面」。
 * %G? 的 G/U/X/Y/R 均为「签名密码学有效」，其中 Y 表示签名有效但密钥现已过期——
 * 必须接受，否则会丢掉旧密钥（2024-01-16 前冻结）签名的全部历史提交；
 * N/E/B 分别表示无签名、无法验证（密钥缺失）、签名损坏，均不可信。
 * 除签名状态外，还须 signer 邮箱与 committer 的姓名、邮箱三重匹配，防止单字段伪造。
 * @param {{ signatureStatus: string; signatureSigner: string; committerName: string; committerEmail: string; }} commit
 * @returns {boolean}
 */
export const isFromGithubWebInterface = ({ signatureStatus, signatureSigner, committerName, committerEmail }) => ["G", "U", "X", "Y", "R"].includes(signatureStatus) && signatureSigner.endsWith(`<${githubWebInterfaceCommitter.committerEmail}>`) && committerName === githubWebInterfaceCommitter.committerName && committerEmail === githubWebInterfaceCommitter.committerEmail;

/**
 * 剥掉 git format 输出尾部拼接的分隔符 ò（git 用非常见字符做字段分隔以避免与内容冲突）。
 * @param {string} str
 * @returns {string}
 */
export const removeSplitter = (str) => str.replace(/ò$/, "").trim();

/**
 * 解析一行 Co-authored-by trailer，得到共同作者姓名、小写邮箱与 GHIA 用户名。
 * 邮箱中可能出现与分隔符相同的 " <" 序列，故按首个 " <" 拆分后把剩余段拼回。
 * @param {string} coAuthorInfo 形如 "Co-authored-by: Name <email>"
 * @returns {{ name: string; email: string; username: string; }}
 */
export const parseCoAuthor = (coAuthorInfo) => {
    const [name, ...restEmail] = coAuthorInfo.replace(/^Co-authored-by: /i, "").split(" <");
    const email = restEmail.join(" <").replace(/>$/, "").toLowerCase();
    const username = Reflect.has(mailmap, email) ? `U:${mailmap[email]}` : `GH:${name}`;
    return { name, email, username };
};
