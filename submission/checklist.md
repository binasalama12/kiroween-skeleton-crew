# Skeleton Crew — Submission Checklist (Kiroween 2026)

**Hard deadline: 5 Dec 2026, 05:00 WIB.**
**Internal target: SUBMIT ≤ 3 Dec 2026** (2-day buffer).
Draft text: `submission/devpost-draft.md` · Video plan:
`submission/video-script.md`.
MVP status: commit `1c9915c` — npm test **40/40** (re-verified 11 Nov
2026 by the packaging run; working tree untouched, no src changes).

## 1. Code-side facts (before recording)

- [x] MVP complete: policy gate + interactive terminal approver + policy
      files + audit report command (commit 1c9915c).
- [x] `npm test` re-run at packaging time: **40/40 pass, 0 fail**.
- [ ] If any code changes before submit, re-run `npm test` and update
      BOTH `submission/devpost-draft.md` and `submission/video-script.md`
      wherever they state the test count ("40/40").
- [x] Confirm the demo output still matches the draft's table (Scout
      ALLOW / Buyer HOLD $750 vs $100 limit / Helper DENY injection):
      run `npm run demo` once and compare. (Re-verified 12 Nov 2026 —
      matches exactly.)
- [ ] Reset the audit log before any recording or screenshot session:
      `rm -f logs/audit.jsonl` (demo recreates it; keeps counts clean).

## 2. Kiro credits form (USER-SIDE — do not automate)

- [ ] **Submit the Kiro credits form (4,000 credits) by 25 Nov 2026.**
      User-side only; Muse does not touch this form.
      **Target internal date: ≤ 25 Nov** (per project plan, aim earlier —
      the form's own cutoff governs).

## 3. Repo readiness (Devpost rules)

- [ ] Repo is **public** on GitHub, all source committed, working tree
      clean. [Fill the final public repo URL into
      `submission/devpost-draft.md`, replacing the placeholder — verify
      the owner/repo path by opening it logged-out; do not guess it.]
- [ ] MIT `LICENSE` present (already in repo) and detected in the GitHub
      "About" section.
- [ ] README complete: quick start (`npm test`, `npm run demo`,
      `npm run demo:interactive`, `npm run report`), layout, and roadmap
      all present (already in repo).
- [ ] Judges can run everything with zero credentials and no install
      beyond Node ≥ 20 — state this in the form's testing instructions
      (text is in the draft's "Try it out" section).
- [x] `logs/audit.jsonl` state decided: it is a runtime artifact and is
      gitignored (`logs/*.jsonl`) — never committed, nothing ships; the
      demo regenerates it. Just clear it before recording (see §1).

## 4. Video (≈2:30, per script)

- [ ] Record per `submission/video-script.md` (narration ≈ 2:20–2:35,
      total runtime in that range — verify the exported file's duration).
- [ ] Screen material only from real runs: `npm run demo`,
      `npm run demo:interactive` (one `yes` take + one decline take),
      `logs/audit.jsonl`, `npm run report`, `npm test`. No mockups, no
      third-party material.
- [ ] Upload to the video host the Devpost form requires (typically a
      public YouTube link), title: "Skeleton Crew — a safety harness for
      AI agent crews (Kiroween 2026)".
- [ ] Paste the video URL into `submission/devpost-draft.md`, replacing
      the placeholder.

## 5. Devpost form

- [ ] Project name: **Skeleton Crew**; tagline per draft.
- [ ] Paste description from `submission/devpost-draft.md` (Inspiration /
      What it does / How we built it / Challenges / Accomplishments /
      What we learned / What's next).
- [ ] **Built-with** list added: Node.js ≥ 20, node:test, Kiro (steering
      files).
- [ ] **Tools / AI usage** field filled (text at the bottom of the
      draft).
- [ ] Prize track(s) selected — **verify the exact track names on the
      live Kiroween Devpost page**; the draft intentionally does not name
      them.
- [ ] Repo URL + video URL filled and verified to open/play logged-out.
- [ ] All materials in English. Team/participant info correct.

## 6. Submit

- [ ] Submit on Devpost **≤ 3 Dec 2026** (hard deadline 5 Dec 2026,
      05:00 WIB).
- [ ] After submitting, open the public project page logged-out and
      verify: description renders, repo link works, video plays, track
      shown.
- [ ] Screenshot / save the submission confirmation for the record.
- [ ] Keep the repo public and the demo runnable through the judging
      period.
