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
const response = await fetch("https://zh.moegirl.org.cn/api.php?action=query&meta=siteinfo&siprop=usergroups&format=json", {
    method: "GET",
}).catch((error) => ({ ok: false, isError: true, error }));
if (!response.ok) {
    console.error(`Failed to fetch user rights: ${response.isError ? errorToString(response.error) : `${response.status} ${response.statusText} ${await response.text()}`}`);
    process.exit(0);
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
