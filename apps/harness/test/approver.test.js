import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { Harness, Decision } from '../harness.js';
import { createTerminalApprover } from '../approver.js';

const heldCall = {
  agent: 'Buyer',
  tool: 'send_payment',
  args: { amount: 750, to: 'airline' },
  source: 'user',
  instruction: 'book it',
};

// A terminal approver wired to in-memory streams, plus a way to read
// everything it printed.
function fakeTerminal() {
  const input = new PassThrough();
  const output = new PassThrough();
  let printed = '';
  output.on('data', (chunk) => { printed += chunk; });
  const approver = createTerminalApprover({ input, output });
  return { input, approver, printed: () => printed };
}

test('typing "yes" approves', async () => {
  const { input, approver } = fakeTerminal();
  const pending = approver(heldCall, ['amount too high']);
  input.write('yes\n');
  assert.equal(await pending, true);
  approver.close();
});

test('the prompt shows the agent, tool, args and reasons being approved', async () => {
  const { input, approver, printed } = fakeTerminal();
  const pending = approver(heldCall, ['amount 750 exceeds the $100 auto-approve limit']);
  input.write('no\n');
  assert.equal(await pending, false);
  const text = printed();
  assert.match(text, /Buyer/);
  assert.match(text, /send_payment/);
  assert.match(text, /750/);
  assert.match(text, /amount 750 exceeds/);
  approver.close();
});

test('"yes" is case-insensitive and ignores surrounding whitespace', async () => {
  const { input, approver } = fakeTerminal();
  const pending = approver(heldCall, []);
  input.write('  YES  \n');
  assert.equal(await pending, true);
  approver.close();
});

test('"y" does NOT approve — only the full word "yes" is consent', async () => {
  const { input, approver } = fakeTerminal();
  const pending = approver(heldCall, []);
  input.write('y\n');
  assert.equal(await pending, false);
  approver.close();
});

test('any other answer declines (fail closed)', async () => {
  const { input, approver } = fakeTerminal();
  const pending = approver(heldCall, []);
  input.write('go ahead\n');
  assert.equal(await pending, false);
  approver.close();
});

test('an empty line declines', async () => {
  const { input, approver } = fakeTerminal();
  const pending = approver(heldCall, []);
  input.write('\n');
  assert.equal(await pending, false);
  approver.close();
});

test('EOF while waiting declines instead of hanging (fail closed)', async () => {
  const { input, approver } = fakeTerminal();
  const pending = approver(heldCall, []);
  input.end(); // Ctrl-D / closed pipe: no answer ever arrives
  assert.equal(await pending, false);
});

test('after EOF, later calls decline immediately without a prompt answer', async () => {
  const { input, approver } = fakeTerminal();
  input.end();
  assert.equal(await approver(heldCall, []), false);
  assert.equal(await approver(heldCall, []), false);
});

test('sequential held calls each get their own answer', async () => {
  const { input, approver } = fakeTerminal();
  const first = approver(heldCall, []);
  input.write('yes\n');
  assert.equal(await first, true);
  const second = approver(heldCall, []);
  input.write('no\n');
  assert.equal(await second, false);
  approver.close();
});

test('harness + terminal approver: typed yes executes a HELD call', async () => {
  const { input, approver } = fakeTerminal();
  const h = new Harness({ approver });
  const pending = h.execute(heldCall, async () => 'paid');
  input.write('yes\n');
  const r = await pending;
  assert.equal(r.decision, Decision.HOLD);
  assert.equal(r.executed, true);
  assert.equal(r.result, 'paid');
  assert.equal(r.outcome, 'held-approved-executed');
  approver.close();
});

test('harness + terminal approver: EOF drops a HELD call (fail closed)', async () => {
  const { input, approver } = fakeTerminal();
  let ran = false;
  const h = new Harness({ approver });
  const pending = h.execute(heldCall, async () => { ran = true; });
  input.end();
  const r = await pending;
  assert.equal(r.executed, false);
  assert.equal(ran, false);
  assert.equal(r.outcome, 'held-declined');
});

test('a crashing approver declines the call and it is still audited', async () => {
  let ran = false;
  const h = new Harness({
    approver: async () => { throw new Error('prompt exploded'); },
  });
  const r = await h.execute(heldCall, async () => { ran = true; });
  assert.equal(r.decision, Decision.HOLD);
  assert.equal(r.executed, false);
  assert.equal(ran, false);
  assert.equal(r.outcome, 'held-declined');
  assert.match(r.reasons.join('; '), /approver failed/);
  assert.equal(h.auditLog.length, 1);
  assert.equal(h.auditLog[0].outcome, 'held-declined');
});
