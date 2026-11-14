import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Harness, createFixedApprover } from '../harness.js';
import { parseAuditLog, summarizeAudit, formatReport } from '../report.js';

const noopExecutor = async () => 'ran';

// A realistic mix through the real harness: 1 ALLOW, 1 HOLD approved,
// 1 HOLD declined, 2 DENY (one injection veto, one hard-deny veto).
async function sampleEntries() {
  const approving = new Harness({ approver: createFixedApprover(true) });
  await approving.execute(
    { agent: 'Scout', tool: 'search_web', args: { query: 'x' }, source: 'user', instruction: '' },
    noopExecutor,
  );
  await approving.execute(
    { agent: 'Buyer', tool: 'send_payment', args: { amount: 750 }, source: 'user', instruction: '' },
    noopExecutor,
  );
  await approving.execute(
    { agent: 'Helper', tool: 'send_payment', args: { amount: 40 }, source: 'untrusted-content', instruction: 'page said so' },
    noopExecutor,
  );

  const declining = new Harness({ approver: createFixedApprover(false) });
  await declining.execute(
    { agent: 'Buyer', tool: 'send_payment', args: { amount: 500 }, source: 'user', instruction: '' },
    noopExecutor,
  );
  await declining.execute(
    { agent: 'Scout', tool: 'exfiltrate_data', args: {}, source: 'user', instruction: '' },
    noopExecutor,
  );

  return [...approving.auditLog, ...declining.auditLog];
}

test('summarizeAudit counts calls by decision and outcome', async () => {
  const s = summarizeAudit(await sampleEntries());
  assert.equal(s.total, 5);
  assert.equal(s.allow, 1);
  assert.equal(s.hold, 2);
  assert.equal(s.deny, 2);
  assert.equal(s.approved, 1);
  assert.equal(s.declined, 1);
  assert.equal(s.executed, 2); // ALLOW + approved HOLD
});

test('the veto list contains every DENIED call with its reason', async () => {
  const s = summarizeAudit(await sampleEntries());
  assert.equal(s.vetoes.length, 2);
  assert.deepEqual(s.vetoes.map((v) => v.tool), ['send_payment', 'exfiltrate_data']);
  assert.equal(s.vetoes[0].agent, 'Helper');
  assert.equal(s.vetoes[0].source, 'untrusted-content');
  assert.match(s.vetoes[0].reasons.join(' '), /prompt injection/);
  assert.match(s.vetoes[1].reasons.join(' '), /hard-deny/);
});

test('summarizeAudit breaks counts down per agent', async () => {
  const s = summarizeAudit(await sampleEntries());
  assert.deepEqual(s.byAgent.Buyer, { total: 2, allow: 0, hold: 2, deny: 0, executed: 1 });
  assert.deepEqual(s.byAgent.Scout, { total: 2, allow: 1, hold: 0, deny: 1, executed: 1 });
  assert.deepEqual(s.byAgent.Helper, { total: 1, allow: 0, hold: 0, deny: 1, executed: 0 });
});

test('an empty log summarises to zeros and no vetoes', () => {
  const s = summarizeAudit([]);
  assert.equal(s.total, 0);
  assert.equal(s.executed, 0);
  assert.deepEqual(s.vetoes, []);
  assert.match(formatReport(s), /Calls:    0/);
  assert.match(formatReport(s), /\(none\)/);
});

test('parseAuditLog round-trips the JSONL the harness writes', async () => {
  const entries = await sampleEntries();
  const text = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
  assert.deepEqual(parseAuditLog(text), entries);
});

test('parseAuditLog skips blank lines and throws on a corrupt line', () => {
  assert.deepEqual(parseAuditLog('\n  \n'), []);
  assert.throws(() => parseAuditLog('{"ok":true}\nnot json\n'), /line 2/);
});

test('formatReport shows the totals, the hold split, and each veto', async () => {
  const text = formatReport(summarizeAudit(await sampleEntries()), { logPath: 'logs/audit.jsonl' });
  assert.match(text, /Log: logs\/audit\.jsonl/);
  assert.match(text, /Calls:    5/);
  assert.match(text, /HOLD:   2 \(approved 1, declined 1\)/);
  assert.match(text, /DENY:   2/);
  assert.match(text, /Executed: 2/);
  assert.match(text, /Vetoes \(2\):/);
  assert.match(text, /Helper · send_payment/);
  assert.match(text, /Per agent:/);
  assert.match(text, /Buyer: 2 calls/);
});

test('the report CLI prints a report for a log file and exits 0', async () => {
  const entries = await sampleEntries();
  const dir = mkdtempSync(join(tmpdir(), 'skeleton-crew-report-'));
  const logPath = join(dir, 'audit.jsonl');
  writeFileSync(logPath, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const out = execFileSync(process.execPath, [join(root, 'report.js'), logPath], { encoding: 'utf8' });
  assert.match(out, /Calls:    5/);
  assert.match(out, /Vetoes \(2\):/);
});

test('the report CLI fails loudly (exit 1) on a missing log file', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  assert.throws(
    () => execFileSync(process.execPath, [join(root, 'report.js'), join(tmpdir(), 'no-such-audit.jsonl')], { encoding: 'utf8', stdio: 'pipe' }),
    (err) => err.status === 1,
  );
});
