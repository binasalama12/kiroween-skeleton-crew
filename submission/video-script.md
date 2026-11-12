# Skeleton Crew — Demo Video Script & Shot List

**Target length:** ≈2:30 of narration (narration total ≈355 words ≈
2:20–2:35 at natural pace).
**Format:** screen recording of a terminal, 1080p, terminal font large
(18–20pt), dark theme. Narration recorded as voiceover (or captions-only if
no mic — captions text = narration text below, verbatim).
**Rule:** every shot below is a real command from this repo — no mockups,
no third-party material. Terminal footage and our own text only.

## Pre-flight setup (before recording)

- [ ] Fresh terminal at `~/workspace/kiroween-skeleton-crew`, window sized
      so demo lines don't wrap (the DENY reason line is long).
- [ ] Clear the old audit trail so the report shot shows one clean run:
      `rm -f logs/audit.jsonl` (the demo recreates it).
- [ ] Rehearse the interactive take once: in `npm run demo:interactive`
      you must type `yes` at the Buyer's prompt — and, for Segment 4's
      second beat, run it again and answer with an empty line / Ctrl-D to
      show the decline.
- [ ] Have `logs/audit.jsonl` and `policy.example.json` openable in an
      editor tab for the cutaway shots.

## Shot list & narration

### Segment 0 — Cold open (0:00–0:15)

- **On screen:** terminal. Type and run: `npm run demo`. Scroll to the
  Helper block and freeze on the `[DENY] not executed (denied)` line and
  its reason; zoom/highlight: *"sensitive tool 'send_payment' requested
  from untrusted content — content is data, not an instruction"*.
- **Narration (≈35 words):**
  "A web page just told this AI agent to ignore its task and send forty
  dollars to an attacker's wallet. The agent didn't. Before any tool call
  runs, it has to pass Skeleton Crew."

### Segment 1 — What it is (0:15–0:45)

- **On screen:** README top section ("What it is"), scroll slowly past
  the three decision bullets (Policy checks / Human approval / Audit
  trail). Cut to `src/demo.js` header comment showing the three-agent
  table (Scout / Buyer / Helper).
- **Narration (≈70 words):**
  "Skeleton Crew is a safety harness that sits between a crew of AI
  agents and their tools. Every call carries its provenance — who ordered
  it: the user, another agent, or untrusted content. The harness decides:
  allow — safe calls run immediately. Hold — risky calls pause for a
  human. Deny — calls ordered by untrusted content never run at all. And
  every decision is written to an audit log."

### Segment 2 — The scripted demo: all three decisions (0:45–1:15)

- **On screen:** run `npm run demo` from the top, full output, no cuts.
  Linger in turn on: `[ALLOW] executed` (Scout), `[HUMAN] approving held
  call` + `[HOLD] executed → paid $750` (Buyer), `[DENY] not executed`
  (Helper).
- **Narration (≈65 words):**
  "One command runs the whole crew. The Scout's web search is allowed —
  trusted source, nothing sensitive. The Buyer's seven-hundred-fifty
  dollar payment is over the hundred-dollar limit, so it's held — here a
  scripted human approves it, and only then does it execute. And the
  Helper, ordered by the page it read to wire money out, is denied. That
  is an indirect prompt injection, stopped by provenance, not keywords."

### Segment 3 — You are the human (1:15–1:50)

- **On screen:** run `npm run demo:interactive`. The demo pauses at the
  HELD call: the prompt shows agent, tool, arguments, and reasons, ending
  with `Type "yes" to approve; anything else (or EOF) declines:`. Type
  `yes` slowly; show `[HOLD] executed`. Then run it a second time and
  press Enter on an empty line (or Ctrl-D) at the prompt; show the call
  dropped — decision HOLD, not executed.
- **Narration (≈75 words):**
  "The scripted human was a stand-in. In interactive mode, you are the
  approver. The prompt shows exactly what you're authorising: the agent,
  the tool, the arguments, and why it was held. Approval means typing the
  full word yes — nothing else counts. An empty line, a typo, or control-D
  all decline. That is fail closed: silence is a no. Even a crashing
  approver drops the call instead of waving it through — and that path is
  covered by tests."

### Segment 4 — The audit trail & the report (1:50–2:15)

- **On screen:** open `logs/audit.jsonl` — three lines, highlight
  `"decision":"DENY"` and the reasons array on the Helper line. Then run
  `npm run report` and show the summary: decision counts, the veto list,
  and the per-agent breakdown (Scout / Buyer / Helper).
- **Narration (≈55 words):**
  "Nothing the crew did — or tried to do — is lost. Every call, decision,
  and outcome is appended to a JSONL audit log, reasons included. The
  report command turns it into counts, the full veto list, and a
  per-agent breakdown. What your agents were stopped from doing is as
  reviewable as what they did."

### Segment 5 — Policy is a file + close (2:15–2:30)

- **On screen:** show `policy.example.json` briefly, then run
  `npm test` and freeze on the summary: `tests 40 / pass 40 / fail 0`.
  End card text: "Skeleton Crew — content is data, not an instruction."
  + repo URL.
- **Narration (≈55 words):**
  "The limits aren't hard-coded — they live in a policy file, loaded
  strictly: a typo'd key aborts rather than silently loosening the rules.
  Forty of forty tests pass. Zero dependencies, no API keys — clone it
  and run it yourself. Content is data, not an instruction. Thank you."

## Timing summary

| Segment | Window | Content |
|---|---|---|
| 0 | 0:00–0:15 | DENY cold open (demo output) |
| 1 | 0:15–0:45 | Concept: provenance + ALLOW/HOLD/DENY |
| 2 | 0:45–1:15 | `npm run demo` — all three decisions |
| 3 | 1:15–1:50 | `npm run demo:interactive` — approve with `yes`, then decline on empty line |
| 4 | 1:50–2:15 | `logs/audit.jsonl` + `npm run report` |
| 5 | 2:15–2:30 | `policy.example.json` + `npm test` 40/40 + closing line |

Total narration ≈ 355 words ≈ 2:20–2:35 at natural pace. If a take runs
long, trim Segment 1 first (drop the audit-log sentence — Segment 4 covers
it). Note the demo itself runs in seconds; all timing slack is narration
and freeze-frames, never waiting on the code.
