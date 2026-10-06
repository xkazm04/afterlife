// A small JSON Schema checker (type, enum, const, required, properties, additionalProperties, items,
// minItems, minLength, maxLength, pattern, minimum, maximum). Enough for ../../flows/schemas/*.json.
// Custom flows cannot use response_schema_id (docs.gitlab.com/user/duo_agent_platform/flows/custom_flows_schema/),
// so a flow's JSON is checked here, in CI, after the fact. Returns a list of problems; empty means valid.

function kind(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return Number.isInteger(v) ? 'integer' : typeof v;
}

const ok = (want, v) => (want === 'number' ? typeof v === 'number' : kind(v) === want);

export function validate(value, schema, at = '$') {
  const bad = [];
  const types = schema.type === undefined ? null : [].concat(schema.type);
  if (types && !types.some((t) => ok(t, value))) return [`${at}: expected ${types.join('|')}, got ${kind(value)}`];
  if (schema.const !== undefined && value !== schema.const) bad.push(`${at}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) bad.push(`${at}: must be one of ${schema.enum.join(', ')}`);
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) bad.push(`${at}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) bad.push(`${at}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) bad.push(`${at}: does not match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) bad.push(`${at}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) bad.push(`${at}: above ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) bad.push(`${at}: fewer than ${schema.minItems} items`);
    if (schema.items) value.forEach((item, i) => bad.push(...validate(item, schema.items, `${at}[${i}]`)));
  }
  if (kind(value) === 'object') {
    for (const k of schema.required ?? []) if (!(k in value)) bad.push(`${at}: missing ${k}`);
    const props = schema.properties ?? {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) bad.push(...validate(v, props[k], `${at}.${k}`));
      else if (schema.additionalProperties === false) bad.push(`${at}: unexpected ${k}`);
    }
  }
  return bad;
}
