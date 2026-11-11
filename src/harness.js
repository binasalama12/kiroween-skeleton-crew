// Skeleton Crew — Agent Safety Harness (core policy gate)
//
// The harness sits between an AI agent and its tools. Every tool call is
// evaluated against a policy BEFORE it runs and is recorded in an
// append-only JSONL audit log:
//
//   ALLOW  — the call runs immediately.
//   HOLD   — the call pauses for a human approver; it runs only on an
//            explicit approval and is dropped on decline/EOF (fail closed).
//   DENY   — the call never runs.
//
// The default policy encodes three rules, in order:
//   1. A tool on the hard-deny list never runs, whoever asks.
//   2. A *sensitive* tool requested on behalf of untrusted content
//      (a web page, an email, a file the agent read) is DENIED — that is
//      the indirect prompt-injection shape: content is data, not orders.
//   3. A call whose monetary amount exceeds `holdAboveAmount` is HELD
//      for human approval.
// Everything else is allowed.

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const Decision = Object.freeze({
  ALLOW: 'ALLOW',
  HOLD: 'HOLD',
  DENY: 'DENY',
});

export const DEFAULT_POLICY = Object.freeze({
  // Monetary amount (in the call's own currency units) above which a call
  // is held for a human.
  holdAboveAmount: 100,
  // Tools that can move money, send messages, or destroy data.
  sensitiveTools: ['send_payment', 'transfer_funds', 'send_email', 'delete_file'],
  // Tools that must never run at all.
  denyTools: ['exfiltrate_data', 'disable_audit_log'],
});

/**
 * A tool call as the harness sees it:
 * {
 *   agent:       string  — which crew member is calling,
 *   tool:        string  — tool name,
 *   args:        object  — tool arguments (may carry `amount`),
 *   source:      'user' | 'agent' | 'untrusted-content',
 *   instruction: string  — the instruction that led to this call (provenance),
 * }
 */
export class Harness {
  /**
   * @param {object}   opts
   * @param {object}   [opts.policy]   Partial policy merged over DEFAULT_POLICY.
   * @param {Function} [opts.approver] async (call, reasons) => boolean.
   *                                    Defaults to declining everything (fail closed).
   * @param {string}   [opts.auditPath] JSONL file to append audit entries to.
   */
  constructor({ policy = {}, approver, auditPath } = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.approver = approver ?? (async () => false);
    this.auditPath = auditPath;
    this.auditLog = []; // in-memory mirror of every decision, oldest first
    if (auditPath) mkdirSync(dirname(auditPath), { recursive: true });
  }

  /** Pure policy evaluation — no execution, no approval prompt. */
  evaluate(call) {
    const reasons = [];
    const { sensitiveTools, denyTools, holdAboveAmount } = this.policy;

    if (denyTools.includes(call.tool)) {
      reasons.push(`tool '${call.tool}' is on the hard-deny list`);
      return { decision: Decision.DENY, reasons };
    }

    if (call.source === 'untrusted-content' && sensitiveTools.includes(call.tool)) {
      reasons.push(
        `sensitive tool '${call.tool}' requested from untrusted content — ` +
        'content is data, not an instruction (possible indirect prompt injection)',
      );
      return { decision: Decision.DENY, reasons };
    }

    const amount = Number(call.args?.amount);
    if (Number.isFinite(amount) && amount > holdAboveAmount) {
      reasons.push(`amount ${amount} exceeds the $${holdAboveAmount} auto-approve limit`);
      return { decision: Decision.HOLD, reasons };
    }

    reasons.push('within policy: trusted source, no amount limit exceeded');
    return { decision: Decision.ALLOW, reasons };
  }

  /**
   * Evaluate a call and, if policy permits, run it through `executor`
   * (an async function receiving the call). HELD calls are passed to the
   * approver first. Returns { decision, executed, reasons, result? }.
   * Every call — executed or not — is written to the audit log.
   */
  async execute(call, executor) {
    const { decision, reasons } = this.evaluate(call);
    let executed = false;
    let result;
    let outcome = 'not-executed';

    if (decision === Decision.ALLOW) {
      result = await executor(call);
      executed = true;
      outcome = 'executed';
    } else if (decision === Decision.HOLD) {
      // Fail closed: a crashing approver is a decline, never an execution,
      // and the call is still audited below.
      let approved = false;
      try {
        approved = await this.approver(call, reasons);
      } catch {
        reasons.push('approver failed — declining (fail closed)');
      }
      if (approved) {
        result = await executor(call);
        executed = true;
        outcome = 'held-approved-executed';
      } else {
        outcome = 'held-declined';
      }
    } else {
      outcome = 'denied';
    }

    this.#audit(call, decision, outcome, reasons);
    return { decision, executed, outcome, reasons, result };
  }

  #audit(call, decision, outcome, reasons) {
    const entry = {
      ts: new Date().toISOString(),
      agent: call.agent,
      tool: call.tool,
      source: call.source ?? 'agent',
      decision,
      outcome,
      reasons,
    };
    this.auditLog.push(entry);
    if (this.auditPath) appendFileSync(this.auditPath, JSON.stringify(entry) + '\n');
  }
}

/**
 * An approver that always returns the same answer and records what it was
 * asked — used by the demo and the tests in place of a human at a prompt.
 */
export function createFixedApprover(answer) {
  const seen = [];
  const approver = async (call, reasons) => {
    seen.push({ call, reasons });
    return answer;
  };
  approver.seen = seen;
  return approver;
}
