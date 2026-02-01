# AXIOM v0 — Behavioral Commitline (frozen)

Version: v0 

## Guaranteed invariants
- Signal node must return `status` = ok | insufficient_signal.
- If status == insufficient_signal then signal_summary, domain, time_horizon MUST be null.
- Reality node must set evidence_summary field; if no direct evidence, must contain exact phrase:
  "Assessment based on general ecosystem patterns and industry knowledge, not direct evidence"
- Verdict must be exactly one of: pursue | explore | ignore.
- Action items must be concrete and testable (artifact / repo / command / doc / benchmark).
- No node shall invent facts or claim production adoption without explicit evidence.

## Failure behavior
- If a node cannot comply with invariants, it must set status = insufficient_signal (for signal) or return a predefined fallback (for reality/verdict).
- Contract violations are recorded as `contract_violation=1` in Opik trace metadata.

## Memory gating (deferred until Day 6)
- Memory write allowed only when contract_violation == 0 AND verdict_confidence != "low".
- Memory schema stores only: topic, verdict, hype_score, confidence_level, timestamp, contract_violation flag.

## Non-goals
- No live web crawling or RAG until v1.
- No model specialization per node until we have evaluation metrics.
