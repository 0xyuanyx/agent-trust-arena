# Final Submission Checklist

## Direction

- [ ] The project is explained as an AI agent trust benchmark, not a generic
  wallet security dashboard.
- [ ] Primary track is Track 06 - Agentic Economy / Agentic Wallets.
- [ ] Secondary track is Track 05 - AI DevTools.
- [ ] The core message is visible: test, trap, audit calldata, and record the
  outcome on Mantle.
- [ ] The demo makes clear that all traps are sandbox/testnet scenarios.
- [ ] ERC-8004 is described only as compatible reputation fields or future
  mapping potential.

## Product Demo

- [ ] `AGENT-001 Yield Pilot` can be selected.
- [ ] `T01 Recipient Mismatch Trap` can be selected.
- [ ] The trust test runs from proposer to auditor to executor.
- [ ] The Intent-Calldata Verifier shows expected deposit and actual transfer.
- [ ] `VERDICT: BLOCKED` is visible within five seconds.
- [ ] The score delta `72 -> 56` is visible.
- [ ] Recent test history updates after a run.
- [ ] Decision evidence panel shows agent ID, scenario ID, verdict, score delta,
  tx hash or Local Simulation Mode.
- [ ] Main run can be explained as deterministic benchmark mode, not live LLM
  mode.
- [ ] For supported trap calldata, the team can point to `decodeCalldata()` and
  `usedFallback: false`.
- [ ] Score-farming explanation is ready with the sequence `84 -> 89 -> 92 -> 92`.
- [ ] Before recording or rehearsal, benchmark state is reset
  (`resetBenchmarkState()` in the browser console or clearing localStorage) so
  scores start from baseline.
- [ ] The live demo URL is deployed, loads correctly, and is included in the
  README and DoraHacks submission.
- [ ] The live demo URL opens correctly in an incognito/private browser window.

## Mantle Evidence

- [ ] Contract address is configured as
  `0xff60e893a08d8c41604d23deb9c435443450e596`.
- [ ] Explorer link opens:
  `https://sepolia.mantlescan.xyz/address/0xff60e893a08d8c41604d23deb9c435443450e596`.
- [ ] `VITE_DECISION_LOGGER_ADDRESS` is present in `.env.local` for the demo
  machine.
- [ ] Wallet is on Mantle Sepolia, chain ID `5003`.
- [ ] If wallet signing or RPC fails, the UI clearly shows Local Simulation Mode.
- [ ] The team has at least one fallback recording path that does not rely on a
  live testnet transaction succeeding during the pitch.

## Language and Copy

- [ ] `src/config/appMode.ts` is set to English for final submission.
- [ ] Korean copy remains available for internal testing.
- [ ] No final UI section mixes Korean and English labels.
- [ ] No component-level UI text was added outside the copy layer during final
  fixes.
- [ ] README and submission copy avoid exaggerated claims about implemented
  standards, absolute security, universal scam prevention, or broad calldata
  coverage.

## English Layout Check

- [ ] Top bar labels fit at desktop and narrow widths after switching to English.
- [ ] Honeypot trap cards fit long titles such as `Recipient Mismatch Trap` and
  `Fake RWA Yield Trap`.
- [ ] Pipeline cards fit permission labels like `Cannot override veto`.
- [ ] Verifier comparison table does not overflow on long decoded calldata labels.
- [ ] Evidence fields fit contract address and tx hash without covering adjacent
  content.
- [ ] Primary buttons and verdict cards remain readable on mobile-size viewports.
- [ ] Submission screenshot uses English UI and does not show Korean-only
  presenter notes.

## Technical Verification

- [ ] `npm install` completes on a clean checkout.
- [ ] `npm run build` passes.
- [ ] `npx hardhat compile` passes before any contract redeploy attempt.
- [ ] Main demo uses deterministic mode by default.
- [ ] `decodeCalldata()` succeeds for the main supported trap path.
- [ ] The demo does not require a backend, database, or mandatory live LLM call.

## Presentation

- [ ] 30-second pitch is rehearsed.
- [ ] 90-second demo is rehearsed at least three times.
- [ ] The presenter can answer: "How is this different from a transaction
  simulator?"
- [ ] The presenter can answer: "Why Mantle?"
- [ ] The presenter can answer: "Does this move real money?"
- [ ] The presenter can answer: "How do you prevent score farming?"
- [ ] The presenter can answer: "Is the result hardcoded?"

## Release Hygiene

- [ ] GitHub repository root README is the final Agent Trust Arena README.
- [ ] DoraHacks submission text is copied from `docs/submission.md`.
- [ ] DoraHacks fields are filled from the field mapping in
  `docs/submission.md`.
- [ ] Demo video shows the same contract address and explorer domain as README.
- [ ] No new features are added on June 15 unless they fix a submission blocker.
- [ ] Branch is reviewed for file ownership: only README and docs changed by
  제출 정리 담당.
