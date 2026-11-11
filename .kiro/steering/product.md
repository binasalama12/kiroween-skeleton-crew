# Product — Skeleton Crew

## What we are building

Skeleton Crew is an **agent safety harness**: a small library that sits
between a crew of AI agents and the tools they can call, and vets every
tool call before it executes.

## Problem

Agents increasingly hold powerful tools (payments, messaging, file and
data mutation) while taking direction from untrusted content — web
pages, emails, documents. A single injected instruction inside that
content can turn a helpful agent into an confused deputy that spends
money or leaks data. Ad-hoc `if` checks inside each agent do not scale
and leave no record.

## The harness contract

Every tool call is a structured object: `{ agent, tool, args, source,
instruction }`, where `source` records provenance (`user`, `agent`, or
`untrusted-content`). The harness returns one of three decisions:

- **ALLOW** — runs immediately.
- **HOLD** — pauses for an explicit human approval; anything other than
  a clear yes drops the call (fail closed).
- **DENY** — never runs.

Every decision and outcome is appended to a JSONL audit log.

## Default policy (v1)

1. Tools on the hard-deny list never run.
2. A sensitive tool (payment, email, delete) requested from
   `untrusted-content` is denied — this is the indirect
   prompt-injection rule and is the heart of the product.
3. Calls with a monetary amount above the configured limit are held
   for a human.

## Who it is for

Developers running multi-agent or tool-using agent systems who need a
single, auditable choke point for tool safety instead of per-agent
prompts and hope.

## Demo story

A three-agent "skeleton crew" (Scout, Buyer, Helper) books a trip:
Scout's benign lookup is allowed, Buyer's over-limit payment is held
and approved by a human, and Helper — ordered by a malicious page to
send money — is denied. Judges should be able to run `npm run demo`
and see all three decisions plus the audit trail in under a minute.

## Non-goals (for the hackathon build)

- No real payment/tool integrations; tools are fakes behind the gate.
- No LLM calls; the crew is scripted so the safety behaviour is
  deterministic and testable.
- No multi-process/distributed harness; single-process library only.
