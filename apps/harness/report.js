// Skeleton Crew — audit report
//
// The harness writes every decision to an append-only JSONL audit log.
// This module turns that log into a short summary a human can scan:
// how many calls there were, how they split across ALLOW / HOLD / DENY,
// how HELD calls ended (approved vs declined), what actually executed,
// a per-agent breakdown, and the veto list — every DENIED call with the
// reason it was stopped. The vetoes are the point of the harness, so
// they are listed in full, not just counted.
//
// Usage: npm run report [-- path/to/audit.jsonl]
//        (defaults to logs/audit.jsonl)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Parse JSONL audit-log text into entries. Blank lines are skipped;
 * a malformed line throws with its line number — a corrupt audit log
 * must fail loudly, not produce a quietly wrong report.
 */
export function parseAuditLog(text) {
  const entries = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    try {
      entries.push(JSON.parse(line));
    } catch (err) {
      throw new Error(`audit log line ${i + 1} is not valid JSON: ${err.message}`);
    }
  }
  return entries;
}

/**
 * Summarise audit entries (objects with agent/tool/decision/outcome,
 * as written by the harness) into counts plus the veto list.
 */
export function summarizeAudit(entries) {
  const summary = {
    total: entries.length,
    allow: 0,
    hold: 0,
    deny: 0,
    executed: 0, // any call that actually ran (ALLOW or approved HOLD)
    approved: 0, // HELD calls the approver let through
    declined: 0, // HELD calls the approver (or EOF/a crash) dropped
    vetoes: [], // every DENIED call, oldest first
    byAgent: {}, // agent -> { total, allow, hold, deny, executed }
  };

  for (const entry of entries) {
    const agent = (summary.byAgent[entry.agent] ??= {
      total: 0, allow: 0, hold: 0, deny: 0, executed: 0,
    });
    agent.total += 1;

    if (entry.decision === 'ALLOW') {
      summary.allow += 1;
      agent.allow += 1;
    } else if (entry.decision === 'HOLD') {
      summary.hold += 1;
      agent.hold += 1;
    } else if (entry.decision === 'DENY') {
      summary.deny += 1;
      agent.deny += 1;
      summary.vetoes.push({
        ts: entry.ts,
        agent: entry.agent,
        tool: entry.tool,
        source: entry.source,
        reasons: entry.reasons ?? [],
      });
    }

    if (entry.outcome === 'executed' || entry.outcome === 'held-approved-executed') {
      summary.executed += 1;
      agent.executed += 1;
    }
    if (entry.outcome === 'held-approved-executed') summary.approved += 1;
    if (entry.outcome === 'held-declined') summary.declined += 1;
  }

  return summary;
}

/** Render a summary as plain text for the terminal. */
export function formatReport(summary, { logPath } = {}) {
  const lines = ['=== Skeleton Crew — audit report ==='];
  if (logPath) lines.push(`Log: ${logPath}`);
  lines.push(
    `Calls:    ${summary.total}`,
    `  ALLOW:  ${summary.allow}`,
    `  HOLD:   ${summary.hold} (approved ${summary.approved}, declined ${summary.declined})`,
    `  DENY:   ${summary.deny}`,
    `Executed: ${summary.executed}`,
    '',
    `Vetoes (${summary.vetoes.length}):`,
  );
  if (summary.vetoes.length === 0) {
    lines.push('  (none)');
  } else {
    for (const v of summary.vetoes) {
      lines.push(`  - ${v.ts ?? '?'} ${v.agent} · ${v.tool} (source: ${v.source ?? '?'})`);
      for (const reason of v.reasons) lines.push(`      ${reason}`);
    }
  }

  lines.push('', 'Per agent:');
  const agents = Object.entries(summary.byAgent);
  if (agents.length === 0) {
    lines.push('  (no calls)');
  } else {
    for (const [name, a] of agents) {
      lines.push(
        `  ${name}: ${a.total} calls (${a.allow} ALLOW, ${a.hold} HOLD, ${a.deny} DENY), ${a.executed} executed`,
      );
    }
  }

  return lines.join('\n');
}

// CLI entry point: `node apps/harness/report.js [path]` (via `npm run report`).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const logPath = process.argv[2] ?? join(root, 'logs', 'audit.jsonl');
  let text;
  try {
    text = readFileSync(logPath, 'utf8');
  } catch (err) {
    console.error(`cannot read audit log '${logPath}': ${err.message}`);
    process.exitCode = 1;
  }
  if (text !== undefined) {
    try {
      console.log(formatReport(summarizeAudit(parseAuditLog(text)), { logPath }));
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
  }
}
