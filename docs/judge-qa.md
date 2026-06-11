# Judge Q&A

## Q1. How is this different from a transaction simulator?

A normal transaction simulator shows what a transaction might do. Agent Trust
Arena benchmarks the AI agent's behavior. It records what the Proposer suggested,
what the Intent-Calldata Verifier decoded, what the Risk Auditor vetoed, whether
the Executor respected the veto, and how the agent's readiness score changed.

The goal is not only transaction safety. The goal is an agent behavior benchmark
that can become part of agent reputation.

## Q2. Why do you need an on-chain log?

AI agents can explain or rationalize decisions after the fact. A Mantle decision
log gives the benchmark a shared evidence layer. The system can record the
agent ID, scenario ID, hashes of the intent, plan, and calldata, the final
verdict, and score delta.

That creates a verifiable record of failures and safe rejections without putting
full prompts, private wallet strategies, personal data, or private reasoning
on-chain.

## Q3. Does this move real money?

No. The MVP is a sandbox/testnet benchmark. The current demo uses deterministic
agents, mock scenarios, limited calldata decoding, and Mantle Sepolia decision
logs. The purpose is to test and block unsafe behavior before live wallet access.

Real fund execution would be a future extension and should require strict wallet
policy, explicit user confirmation, small limits, and auditor approval.

## Q4. Why Mantle?

Mantle's Turing Test Hackathon focuses on agentic AI, on-chain infrastructure,
AI benchmarking, and verifiable agent decisions. Agent Trust Arena directly maps
to that direction by testing wallet agents in adversarial scenarios and recording
their outcomes on Mantle Sepolia.

It fits Track 06 as an agentic wallet trust layer and Track 05 as an AI DevTool
for agent builders and wallet teams.

## Q5. How do you prevent score farming?

The scoring model uses trap-specific contributions. A new distinct trap can
change the cumulative readiness score, but replaying the same trap replaces the
previous contribution for that scenario instead of stacking points.

For example, the validation sequence `84 -> 89 -> 92 -> 92` shows the intended
behavior: distinct safe trap outcomes can improve readiness, while repeating an
already-counted trap does not endlessly increase the score.

Implementation-wise, the score contribution is keyed by scenario ID. A rerun of
the same trap updates that scenario's contribution rather than appending another
reward. This is enough for the hackathon benchmark demo and keeps the score
card from being inflated by repeated clicks.

This makes the current demo suitable for a benchmark surface without pretending
that repeated local clicks are a production-grade anti-gaming system. Stronger
anti-farming controls, such as signed scenario packs, randomized trap rotation,
and external attestation, are future work.

## Q6. Is the result hardcoded?

The benchmark uses deterministic scenario seeds for demo reliability, but the
verifier path is not just a static text result. The app decodes the actual hidden
calldata hex through `decodeCalldata()`. For the supported P0/P1 scenarios, the
runner can use the decoder path with `usedFallback: false` when calldata decoding
succeeds.

The permission split is also enforced by code structure: `runBenchmark()` calls
the Proposer, then the verifier and Risk Auditor, then the Executor. The Executor
does not get a path to override an auditor veto. That is the core safety shape
being demonstrated.

The deterministic seed defines what the trap is; the verifier still has to
decode and compare the calldata. That distinction is important: this is a stable
benchmark harness, not a live autonomous-agent claim.

The current implementation is still a deterministic sandbox benchmark, not a
claim that every possible live DeFi transaction or agent runtime is covered.
