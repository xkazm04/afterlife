// Starts a custom flow run through the Flows API: POST /ai/duo_workflows/workflows
// (docs.gitlab.com/api/duo_agent_platform_flows: project_id, goal, ai_catalog_item_consumer_id, start_workflow, environment).
// Why this exists: a trigger needs a human to perform the triggering action (docs.gitlab.com/user/duo_agent_platform/triggers),
// so an MR opened by another flow's service account never fires the guardrail's "MR created" trigger.
// Whether this call works with a given token, and which identity the run gets, is spike S1 [R?].
import { api, die, need } from '../lib/lib.mjs';

const goal = need('goal');
if (!/^(\d+|https:\/\/[^\s]+)$/.test(goal)) die('goal must be an MR iid or an https URL, never free text from an MR');
const consumer = Number(need('consumer-id'));
if (!Number.isInteger(consumer)) die('--consumer-id must be the integer id of the flow enabled in this project');

const res = api('ai/duo_workflows/workflows', {
  method: 'POST',
  body: { project_id: process.env.CI_PROJECT_ID, goal, ai_catalog_item_consumer_id: consumer, start_workflow: true, environment: 'ambient' },
});
console.error(`belay: started flow run ${res?.id ?? '?'} ${res?.web_url ?? ''}`);
console.log(JSON.stringify({ id: res?.id ?? null, status: res?.status ?? null }));
