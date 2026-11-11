# Skeleton Crew

**An agent safety harness for AI agent crews — built for Kiroween 2026.**

> Status: hackathon project under construction. The policy-gate core, a
> scripted demo crew, and tests are in place; the interactive approval
> prompt and a real tool backend are next (see Roadmap).

## What it is

AI agents are increasingly given tools that can spend money, send
messages, and change data — and they take instructions from content that
anyone can write (web pages, emails, files). Skeleton Crew is a thin
safety layer that sits **between a crew of AI agents and their tools**.
Every tool call passes through the harness first:

- **Policy checks** — each call is decided as **ALLOW**, **HOLD**, or
  **DENY**, with human-readable reasons:
  - hard-deny list: some tools never run at all;
  - provenance rule: a *sensitive* tool (payments, email, deletes)
    requested on behalf of **untrusted content** is denied — content is
    data, not an instruction, which is exactly the shape of an indirect
    prompt-injection attack;
  - amount rule: calls above a configurable monetary limit are held.
- **Human approval** — a HELD call pauses and is put to a human
  approver. It executes only on an explicit yes; decline, silence, or
  EOF drops it (fail closed).
- **Audit trail** — every call, its decision, and its outcome are
  appended to a JSONL audit log, so what the crew did — and what it was
  *stopped* from doing — is reviewable after the fact.

The demo crew is a "skeleton crew" in the literal sense: the smallest
possible team (a scout, a buyer, and a helper) that shows all three
decisions end to end.

## Quick start

No dependencies and no API keys — plain Node.js (≥ 20).

```bash
npm test        # policy-gate unit tests (node:test)
npm run demo    # run the demo crew; audit trail lands in logs/audit.jsonl
```

The demo runs three calls through the harness:

| Agent  | Call                                              | Decision |
| ------ | ------------------------------------------------- | -------- |
| Scout  | `search_web` for the user                         | ALLOW    |
| Buyer  | `send_payment` of $750 (over the $100 limit)      | HOLD → approved by the (scripted) human → executed |
| Helper | `send_payment` ordered by a page it read          | DENY (injection) |

## Layout

- `src/harness.js` — the policy gate (`Harness.evaluate` / `Harness.execute`), default policy, audit logging.
- `src/demo.js` — the scripted three-agent demo crew.
- `test/harness.test.js` — decision tests: allow, hold+approve, hold+decline (fail closed), injection deny, hard-deny, audit completeness.
- `.kiro/steering/` — Kiro steering files (product, tech, structure) describing this project.

## Roadmap

- Interactive terminal approver for HELD calls (typed approval, not scripted).
- Pluggable tool backends (real APIs behind the same gate).
- Policy files (per-crew limits, tool lists) loaded from config.
- A small report command that summarises the audit log per agent.

## License

MIT — see [LICENSE](LICENSE).
