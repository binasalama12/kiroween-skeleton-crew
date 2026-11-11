// Skeleton Crew — interactive terminal approver
//
// A human approver for HELD calls, backed by a real input/output stream
// pair (stdin/stdout by default). It follows the same contract as every
// other approver — async (call, reasons) => boolean — so it drops into
// the harness in place of the scripted/fixed approvers.
//
// Fail closed, per the project's design rules:
//   - Only an explicit "yes" (typed in full, case-insensitive, surrounding
//     whitespace ignored) approves. "y", "ok", an empty line, or anything
//     else declines — a held call is a money/data-moving call, so a vague
//     answer must never be read as consent.
//   - EOF (Ctrl-D, a closed pipe, the input stream ending) declines any
//     call that is waiting for an answer, and every call after it.
//   - The approver never throws into the harness: stream problems resolve
//     to a decline, not an exception.
//
// The prompt shows exactly what the human is being asked to authorise —
// agent, tool, arguments, provenance, instruction, and the harness's
// reasons — because approving blind is no better than not asking.

import { createInterface } from 'node:readline';

/**
 * @param {object} [opts]
 * @param {import('node:stream').Readable} [opts.input]  Defaults to process.stdin.
 * @param {import('node:stream').Writable} [opts.output] Defaults to process.stdout.
 * @returns {Function} approver — async (call, reasons) => boolean, with a
 *                     `.close()` method that releases the input stream.
 */
export function createTerminalApprover({ input = process.stdin, output = process.stdout } = {}) {
  const rl = createInterface({ input, terminal: false });

  let closed = false;
  const lineBuffer = []; // lines received while nobody was waiting
  let waiter = null; // resolve() of the call currently awaiting an answer

  rl.on('line', (line) => {
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      resolve(line);
    } else {
      lineBuffer.push(line);
    }
  });

  rl.on('close', () => {
    closed = true;
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      resolve(null); // EOF while waiting -> decline
    }
  });

  // The next typed line, or null on EOF. Never rejects.
  function nextLine() {
    if (lineBuffer.length > 0) return Promise.resolve(lineBuffer.shift());
    if (closed) return Promise.resolve(null);
    return new Promise((resolve) => { waiter = resolve; });
  }

  function formatPrompt(call, reasons) {
    const lines = [
      '',
      '--- HELD for human approval ---',
      `  agent:       ${call.agent}`,
      `  tool:        ${call.tool}`,
      `  args:        ${JSON.stringify(call.args ?? {})}`,
      `  source:      ${call.source ?? 'agent'}`,
      `  instruction: ${call.instruction ?? ''}`,
      `  why held:    ${(reasons ?? []).join('; ')}`,
      'Type "yes" to approve; anything else (or EOF) declines: ',
    ];
    return lines.join('\n');
  }

  const approver = async (call, reasons) => {
    if (closed) return false;
    try {
      output.write(formatPrompt(call, reasons));
      const line = await nextLine();
      if (line === null) return false; // EOF — fail closed
      return line.trim().toLowerCase() === 'yes';
    } catch {
      return false; // a broken prompt must never approve — fail closed
    }
  };

  approver.close = () => {
    if (!closed) rl.close();
  };

  return approver;
}
