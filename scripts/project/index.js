import console from "../modules/console.js";
console.info("Initialization done.");
import { octokit, isInGithubActions, octokitBaseOptions } from "../modules/octokit.js";
import { graphql } from "@octokit/graphql";
import { createAppAuth } from "@octokit/auth-app";
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    //process.exit(0);
}
const auth = createAppAuth({
    /* appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET, */
});
const graphqlWithAuth = graphql.defaults({
    request: {
        hook: auth.hook,
    },
});
console.info((await graphqlWithAuth(
    `query{
        organization(login: "${octokitBaseOptions.owner || "MoegirlPediaInterfaceAdmins"}") {
            projectV2(number: 1) {
                items(first: 20) {
                    nodes {
                        content
                        databaseId
                    }
                }
            }
        }
    }`,
)).organization.projectV2.items);
/*
const { organization: { projectV2: { id:
    projectId,
} } } = await graphqlWithAuth(
    `query{
        organization(login: "${octokitBaseOptions.owner}") {
            projectV2(number: 1) {
                items
            }
        }
    }`,
);

const type = process.env.TYPE;
const nodeId = process.env.NODE_ID;

await graphqlWithAuth(
    `query{
        node(id: "${projectId}") {
            projectV2(number: 1) {
                id
            }
        }
    }`,
);
*/
