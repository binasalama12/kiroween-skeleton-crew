import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Harness, Decision, DEFAULT_POLICY } from '../harness.js';
import { loadPolicy, validatePolicy } from '../policy.js';

function writePolicyFile(contents) {
  const dir = mkdtempSync(join(tmpdir(), 'skeleton-crew-policy-'));
  const path = join(dir, 'policy.json');
  writeFileSync(path, typeof contents === 'string' ? contents : JSON.stringify(contents));
  return path;
}

test('loadPolicy reads a valid policy file', () => {
  const path = writePolicyFile({ holdAboveAmount: 250, denyTools: ['nuke_everything'] });
  const policy = loadPolicy(path);
  assert.equal(policy.holdAboveAmount, 250);
  assert.deepEqual(policy.denyTools, ['nuke_everything']);
  assert.equal(policy.sensitiveTools, undefined); // partial: harness fills defaults
});

test('a loaded policy changes harness decisions (limit from config, not code)', () => {
  const path = writePolicyFile({ holdAboveAmount: 10 });
  const h = new Harness({ policy: loadPolicy(path) });
  // $40 payment: ALLOW under the $100 default, HOLD under the file's $10.
  const { decision } = h.evaluate(
    { agent: 'Buyer', tool: 'send_payment', args: { amount: 40 }, source: 'user', instruction: 'pay' },
  );
  assert.equal(decision, Decision.HOLD);
});

test('a loaded policy replaces the tool lists', () => {
  const path = writePolicyFile({ sensitiveTools: ['wire_money'], denyTools: ['launch_missiles'] });
  const h = new Harness({ policy: loadPolicy(path) });

  assert.equal(
    h.evaluate({ agent: 'A', tool: 'launch_missiles', args: {}, source: 'user', instruction: '' }).decision,
    Decision.DENY,
  );
  // wire_money is sensitive only because the file says so.
  assert.equal(
    h.evaluate({ agent: 'A', tool: 'wire_money', args: {}, source: 'untrusted-content', instruction: '' }).decision,
    Decision.DENY,
  );
  // send_payment is off the file's sensitive list, so provenance alone no longer denies it.
  assert.equal(
    h.evaluate({ agent: 'A', tool: 'send_payment', args: { amount: 1 }, source: 'untrusted-content', instruction: '' }).decision,
    Decision.ALLOW,
  );
});

test('omitted fields fall back to DEFAULT_POLICY', () => {
  const h = new Harness({ policy: loadPolicy(writePolicyFile({ holdAboveAmount: 5 })) });
  assert.equal(h.policy.holdAboveAmount, 5);
  assert.deepEqual(h.policy.sensitiveTools, DEFAULT_POLICY.sensitiveTools);
  assert.deepEqual(h.policy.denyTools, DEFAULT_POLICY.denyTools);
});

test('the shipped policy.example.json loads and matches the defaults', async () => {
  const { fileURLToPath } = await import('node:url');
  const { dirname } = await import('node:path');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const h = new Harness({ policy: loadPolicy(join(root, 'policy.example.json')) });
  assert.deepEqual(h.policy, { ...DEFAULT_POLICY });
});

test('loadPolicy throws on a missing file', () => {
  assert.throws(() => loadPolicy(join(tmpdir(), 'no-such-policy-file.json')), /cannot read policy file/);
});

test('loadPolicy throws on malformed JSON', () => {
  assert.throws(() => loadPolicy(writePolicyFile('{ not json')), /not valid JSON/);
});

test('loadPolicy throws on an unknown field (a typo must not slip through)', () => {
  assert.throws(() => loadPolicy(writePolicyFile({ holdAboveAmout: 10 })), /unknown policy field/);
});

test('loadPolicy throws on wrong types', () => {
  assert.throws(() => loadPolicy(writePolicyFile({ holdAboveAmount: 'lots' })), /holdAboveAmount/);
  assert.throws(() => loadPolicy(writePolicyFile({ sensitiveTools: 'send_payment' })), /sensitiveTools/);
  assert.throws(() => loadPolicy(writePolicyFile({ denyTools: [42] })), /denyTools/);
  assert.throws(() => loadPolicy(writePolicyFile({ holdAboveAmount: -1 })), /holdAboveAmount/);
});

test('validatePolicy rejects a non-object policy', () => {
  assert.throws(() => validatePolicy([1, 2, 3]), /must be a JSON object/);
  assert.throws(() => validatePolicy('policy'), /must be a JSON object/);
});

test('the harness itself rejects an invalid policy at construction', () => {
  assert.throws(() => new Harness({ policy: { holdAboveAmount: -5 } }), /holdAboveAmount/);
  assert.throws(() => new Harness({ policy: { bogusField: true } }), /unknown policy field/);
});
