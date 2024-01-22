import console from "../modules/console.js";
console.info("Initialization done.");
import createCommit from "../modules/createCommit.js";
import jsonModule from "../modules/jsonModule.js";
import { startGroup, endGroup } from "@actions/core";
import { sortWithLowerFirstCharacter } from "../modules/sortWithLowerFirstCharacter.js";

console.info("Start to download the user rights...");
const response = await fetch("https://zh.moegirl.org.cn/api.php?action=query&meta=siteinfo&siprop=usergroups&format=json", {
    method: "GET",
});
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
