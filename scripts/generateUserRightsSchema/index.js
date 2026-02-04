import { endGroup, error, startGroup } from "@actions/core";
import console from "../modules/console.js";
import createCommit from "../modules/createCommit.js";
import jsonModule from "../modules/jsonModule.js";
import { sortWithLowerFirstCharacter } from "../modules/sortWithLowerFirstCharacter.js";
import upstream from "../modules/getUpstream.js";
console.info("Initialization done.");

if (!upstream) {
    console.info("HEAD does not point to a branch, exit.");
    process.exit(0);
}

console.info("Start to download the user rights...");
const response = await fetch("https://zh.moegirl.org.cn/api.php?action=query&meta=siteinfo&siprop=usergroups&format=json", {
    method: "GET",
});
if (!response.ok) {
    error(`Failed to fetch user rights: ${response.status} ${response.statusText} ${await response.text()}`);
    process.exit(0);
}
const data = await response.json();
startGroup("User right api:");
console.info(data);
endGroup();
console.info("\tDone.");
const userRightsSet = new Set();
for (const { rights } of data.query.usergroups) {
    for (const right of rights) {
        userRightsSet.add(right);
    }
}
const userRights = sortWithLowerFirstCharacter([...userRightsSet]);
startGroup("userRights:");
console.info(userRights);
endGroup();
const schema = await jsonModule.readFile(".vscode/json-schemas/user-rights-definition.json");
startGroup("old schema:");
console.info(schema);
endGroup();
schema.definitions.userRights.enum = userRights;
startGroup("new schema:");
console.info(schema);
endGroup();
await jsonModule.writeFile(".vscode/json-schemas/user-rights-definition.json", schema);
await createCommit("auto: regenerated user-rights-definition.json by generateUserRightsSchema");
