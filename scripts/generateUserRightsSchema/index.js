import console, { dump } from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import errorToString from "../modules/errorToString.js";
import exitIf from "../modules/exitIf.js";
import upstream from "../modules/getUpstream.js";
import jsonModule from "../modules/jsonModule.js";
import "../modules/setupFetchUserAgent.js";
import { sortWithLowerFirstCharacter } from "../modules/sortWithLowerFirstCharacter.js";
console.info("Initialization done.");

exitIf(!upstream, "HEAD does not point to a branch, exit.");

console.info("Start to download the user rights...");
// 数据源是自建聚合接口 moegirlpedia.annangela.cn：返回结构与 api.php 的
// siprop=usergroups 完全一致（含 query 包裹），仅顶层额外附带 fetchedAt 抓取时间
const response = await fetch("https://moegirlpedia.annangela.cn/usergroups?site=zh", {
    method: "GET",
}).catch((error) => ({ ok: false, isError: true, error }));
if (!response.ok) {
    console.error(`Failed to fetch user rights: ${response.isError ? errorToString(response.error) : `${response.status} ${response.statusText} ${await response.text()}`}`);
    // 抓取失败必须以非零退出码结束，否则 CI 无法感知，过期 schema 会被静默沿用
    process.exit(1);
}
const data = await response.json();
dump("User right api:", data);
console.info("\tDone.");
const userRightsSet = new Set();
for (const { rights } of data.query.usergroups) {
    for (const right of rights) {
        userRightsSet.add(right);
    }
}
const userRights = sortWithLowerFirstCharacter([...userRightsSet]);
dump("userRights:", userRights);
const schema = await jsonModule.readFile(".vscode/json-schemas/user-rights-definition.json");
dump("old schema:", schema);
schema.definitions.userRights.enum = userRights;
dump("new schema:", schema);
await jsonModule.writeFile(".vscode/json-schemas/user-rights-definition.json", schema);
await createCommit("auto: regenerated user-rights-definition.json by generateUserRightsSchema");
