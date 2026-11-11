// Skeleton Crew — policy files
//
// Until now the policy (hold limit, sensitive-tool list, hard-deny list)
// lived in code as DEFAULT_POLICY. A crew's real limits differ per
// deployment, so the policy can now be loaded from a JSON config file:
//
//   {
//     "holdAboveAmount": 250,
//     "sensitiveTools": ["send_payment", "send_email"],
//     "denyTools": ["exfiltrate_data"]
//   }
//
// Every field is optional — anything omitted falls back to the harness
// defaults when the loaded object is passed to `new Harness({ policy })`.
//
// Loading is strict on purpose: a safety policy with a typo in it must
// fail loudly at startup, never silently fall back to looser rules.
// Unknown keys, wrong types, malformed JSON, and a missing file all
// throw. (This validates shape only; the harness merges over defaults.)

import { readFileSync } from 'node:fs';

const STRING_LIST_FIELDS = ['sensitiveTools', 'denyTools'];
const KNOWN_FIELDS = ['holdAboveAmount', ...STRING_LIST_FIELDS];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate the shape of a (partial or complete) policy object.
 * Returns the object unchanged on success; throws TypeError otherwise.
 */
export function validatePolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new TypeError('policy must be a JSON object');
  }

  for (const key of Object.keys(policy)) {
    if (!KNOWN_FIELDS.includes(key)) {
      throw new TypeError(
        `unknown policy field '${key}' (known: ${KNOWN_FIELDS.join(', ')})`,
      );
    }
  }

  if ('holdAboveAmount' in policy) {
    const amount = policy.holdAboveAmount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      throw new TypeError('policy.holdAboveAmount must be a non-negative number');
    }
  }

  for (const field of STRING_LIST_FIELDS) {
    if (field in policy) {
      const list = policy[field];
      if (!Array.isArray(list) || list.some((t) => typeof t !== 'string' || t === '')) {
        throw new TypeError(`policy.${field} must be an array of non-empty tool names`);
      }
    }
  }

  return policy;
}

/**
 * Load a policy from a JSON file. Returns a partial policy suitable for
 * `new Harness({ policy })`. Throws on a missing/unreadable file,
 * malformed JSON, or an invalid policy shape.
 */
export function loadPolicy(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(`cannot read policy file '${path}': ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`policy file '${path}' is not valid JSON: ${err.message}`);
  }

  try {
    return validatePolicy(parsed);
  } catch (err) {
    throw new Error(`policy file '${path}': ${err.message}`);
  }
}
