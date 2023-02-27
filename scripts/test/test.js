"use strict";
const { octokit } = require("../modules/octokit.js");
const core = require("@actions/core");
(async () => {
    const workflow_runs = (await octokit.rest.actions.listWorkflowRuns({
        workflow_id: "test.yml",
        per_page: 100,
        created: "<2023-01-01",
    })).data.workflow_runs;
    core.startGroup("workflow_runs");
    console.info(workflow_runs);
    core.endGroup();
    const failed = [];
    for (const { id } of workflow_runs) {
        try {
            const result = await octokit.rest.actions.deleteWorkflowRun({
                run_id: id,
            });
            core.startGroup(`deleteWorkflowRun - ${id}`);
            console.info(result);
            core.endGroup();
        } catch (e) {
            core.startGroup(`[failed] deleteWorkflowRun - ${id}`);
            console.error(e);
            core.endGroup();
            failed.push(id);
        }
    }
    if (failed.length === 0) {
        console.info("No failed");
    } else {
        console.error("failed:", failed);
    }
    core.startGroup("process.env");
    console.info(process.env);
    core.endGroup();
})();
