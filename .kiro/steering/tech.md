# Tech — Skeleton Crew

## Stack

- **Runtime:** Node.js ≥ 20, plain JavaScript, ES modules
  (`"type": "module"` in package.json).
- **Dependencies:** none. The harness core must stay dependency-free so
  it can be dropped into any agent project and audited at a glance.
- **Tests:** the built-in `node:test` runner (`npm test`).
- **Audit log:** append-only JSONL (one JSON object per line) written
  with `node:fs` `appendFileSync`; a mirrored in-memory array is kept
  on the `Harness` instance for tests and reporting.

## Design rules

- **Fail closed everywhere.** The default approver declines; a missing
  or crashing approver must never result in execution.
- **Decisions are pure, execution is separate.** `Harness.evaluate()`
  is a pure function of (call, policy) so policies can be unit-tested
  without executors. `Harness.execute()` adds approval + execution +
  auditing around it.
- **Provenance is a first-class field.** Policy rules key off
  `call.source`; never infer trust from instruction text.
- **Reasons are mandatory.** Every decision carries human-readable
  reason strings; they go to the console, the approver prompt, and the
  audit log verbatim.
- **No secrets, no network in the core.** The harness and demo run
  fully offline; tool implementations are injected executors.

## Commands

- `npm test` — run the node:test suite in `test/`.
- `npm run demo` — run `src/demo.js`; writes `logs/audit.jsonl`.

## Style

- Small single-purpose modules; the whole core should stay readable in
  one sitting.
- Named exports; `Decision` is a frozen enum-like object
  (`ALLOW` / `HOLD` / `DENY`).
