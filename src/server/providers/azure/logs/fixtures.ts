// Responses in the exact shapes `az monitor log-analytics` printed against a real workspace (values invented; no
// shared keys, IPs, user agents or URLs). The fake az itself is App Insights' fakeAz.
export { EXPIRED, fakeAz } from '../insights/fixtures';

export const SUB = '00000000-0000-4000-8000-000000000002';
export const WS_ID = '22222222-3333-4444-8555-666666666666';
export const WORKSPACE = {
  customerId: WS_ID,
  id: `/subscriptions/${SUB}/resourceGroups/shop-rg/providers/Microsoft.OperationalInsights/workspaces/shop-logs`,
  name: 'shop-logs',
  resourceGroup: 'shop-rg',
};

/** `az monitor log-analytics query` output: a list of row objects, every value a string, rows in no particular order. */
export const rows = (r: [string, string, string][]): unknown =>
  r.map(([timestamp, v, n]) => ({ TableName: 'PrimaryResult', n, timestamp, v }));

export const COUNT = (n: number) => [{ Count: String(n), TableName: 'PrimaryResult' }];

/** What az printed for a workspace with no App Service diagnostic setting (the table was never created). */
export const NO_TABLE_ERR = [
  'ERROR: (BadArgumentError) The request had some invalid properties',
  'Code: BadArgumentError',
  'Message: The request had some invalid properties',
  'Inner error: {',
  '    "code": "SemanticError",',
  '    "innererror": {',
  '        "code": "SEM0100",',
  '        "message": "\'count\' operator: Failed to resolve table or column expression named \'AppServiceHTTPLogs\'"',
  '    }',
  '}',
].join('\n');

/** What az printed with the preview extension missing: its install prompt read EOF from execFile's stdin. */
export const NO_EXTENSION_ERR = [
  'The command requires the extension log-analytics. Do you want to install it now? The command will continue to run after the extension is installed. (Y/n): WARNING: Preview version of extension is disabled by default for extension installation, enabled for modules without stable versions.',
  'ERROR: The command failed with an unexpected error. Here is the traceback:',
  'ERROR: EOF when reading a line',
].join('\n');
