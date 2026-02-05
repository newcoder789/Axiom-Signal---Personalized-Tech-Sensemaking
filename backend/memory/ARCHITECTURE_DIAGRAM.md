# Architecture & Integration Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AXIOM AGENT PIPELINE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  app.py / axiom_with_memory.py                                     │
│         ↓                                                           │
│  graph_utils.py                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │  LLM Pipeline (LangGraph)                            │          │
│  │  ┌─────────────────┐  ┌─────────────────┐           │          │
│  │  │ Signal Framing  │→ │ Reality Check   │           │          │
│  │  └─────────────────┘  └─────────────────┘           │          │
│  │         ↓                      ↓                     │          │
│  │  ┌──────────────────────────────────┐               │          │
│  │  │ Verdict Synthesis Node           │               │          │
│  │  │ (LLM decides: pursue/explore/    │               │          │
│  │  │  ignore + reasoning)             │               │          │
│  │  └──────────────────────────────────┘               │          │
│  │         ↓                                           │          │
│  │  [Optional] Memory Write                           │          │
│  │         ↓                                           │          │
│  │  Return Result                                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                          ↓                                         │
└─────────────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  MEMORY SYSTEM (OPTIONAL)            │
        │                                      │
        │  manager.py                          │
        │  (AxiomMemoryManager)                │
        │  ├─ User ID derivation               │
        │  ├─ Context orchestration            │
        │  └─ Verdict processing               │
        │         ↓                            │
        │  redis_vector.py                     │
        │  (RedisVectorMemory)                 │
        │  ├─ encode_vec()         ← NEW       │
        │  ├─ detect_contract_violation() ← NEW│
        │  ├─ _check_memory_threshold() ← NEW  │
        │  ├─ _store_decision()     (idempotent)│
        │  ├─ Metrics tracking      ← NEW      │
        │  └─ Better error handling ← NEW      │
        │         ↓                            │
        │  Redis Stack (docker)                │
        │  ├─ idx:axiom:user_traits            │
        │  ├─ idx:axiom:topic_patterns         │
        │  ├─ idx:axiom:decisions              │
        │  └─ axiom:decision_sig:* (idempotency)│
        │                                      │
        └──────────────────────────────────────┘
```

---

## Data Flow: Old vs New

### OLD (Before Changes)

```
Verdict → manager.process_verdict()
    ↓
RedisVectorMemory(redis://localhost)
    ↓
[Basic storage, some risk of:]
  - Dtype mismatches
  - Dimension errors
  - Duplicates
  - Memory bloat
    ↓
Redis (unsecured)
    ↓
Return: {success: bool}
```

### NEW (After Changes)

```
Verdict → manager.process_verdict()
    ↓
RedisVectorMemory(
  redis_url,
  index_algorithm="FLAT|HNSW",        ← SELECTABLE
  memory_threshold_mb=512              ← CONFIGURABLE
)
    ↓
[Safety gates applied]:
  1. _check_memory_threshold()         ← NEW
  2. detect_contract_violation()       ← NEW
  3. encode_vec() guard               ← NEW
  4. decision_sig() idempotency       ← NEW
  5. Better error handling            ← NEW
    ↓
Redis (safe, indexed, optimized)
    ↓
Return: {
  success: bool,
  metrics: {...}                       ← NEW
}
```

---

## Memory System States

```
┌─────────────────────────────────────────────┐
│   MEMORY SYSTEM CONFIGURATION               │
├─────────────────────────────────────────────┤
│                                             │
│  DISABLED                                   │
│  ├─ MEMORY_AVAILABLE = False               │
│  ├─ Pipeline continues normally             │
│  └─ No Redis calls                         │
│                                             │
│  ENABLED (Local Development)               │
│  ├─ redis_url="redis://localhost:6379"    │
│  ├─ index_algorithm="FLAT"  (exact, slow) │
│  ├─ memory_threshold_mb=512                │
│  └─ Fast iteration, all data validated     │
│                                             │
│  ENABLED (Production)                      │
│  ├─ redis_url="redis://prod-redis:6379"  │
│  ├─ index_algorithm="HNSW"  (approx, fast)│
│  ├─ memory_threshold_mb=2048              │
│  └─ Scalable, performant, safe            │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Integration Points

### 1. graph_utils.py → manager.py → redis_vector.py

```python
# graph_utils.py (Line 741)
memory_result = memory_manager.process_verdict(
    user_profile="...",
    topic="...",
    verdict_data={...},           # From LLM
    signal_data={...},            # From signal node
    reality_check_data={...},     # From reality node
    pipeline_state={
        "contract_violation": False  # ← NEW: Used here
    }
)

# → manager.py creates MemoryWriteContext
# → redis_vector.py.process_verdict() called
#   ├─ Checks memory threshold
#   ├─ Detects contract violations
#   ├─ Extracts user traits
#   ├─ Extracts topic patterns
#   ├─ Stores decision (idempotent)
#   └─ Returns results with metrics
```

### 2. manager.py → redis_vector.py

```python
# manager.py (Line 152)
memory_results = self.vector_memory.process_verdict(ctx)

# redis_vector.py (Line 330)
def process_verdict(self, ctx: MemoryWriteContext) -> Dict[str, Any]:
    results = {
        "user_traits": [],
        "topic_patterns": [],
        "decision_stored": False,
        "reasons": {},
        "metrics": {}      # ← NEW
    }
    
    # Safety gates
    if not self._check_memory_threshold():          # ← NEW
        return results
    
    if self.detect_contract_violation(...):         # ← NEW
        return results
    
    # Process traits, patterns, decisions
    # ...
    
    results["metrics"] = self.metrics.summary()     # ← NEW
    return results
```

### 3. axiom_with_memory.py → manager.py

```python
# axiom_with_memory.py (Line 240)
storage_result = self.memory_manager.process_verdict(
    user_profile=self.user_profile,
    topic=query,
    verdict_data=verdict_node.model_dump(),
    signal_data=signal_node.model_dump(),
    reality_check_data=reality_check_node.model_dump(),
    pipeline_state={"contract_violation": False}
)

# Same interface, enhanced internals
```

---

## Configuration Flow

```
┌────────────────────────────────────────────────┐
│ How to Configure Memory System                │
├────────────────────────────────────────────────┤
│                                                │
│ Option 1: Default (RECOMMENDED)               │
│ ───────────────────────────────────────────   │
│ manager = AxiomMemoryManager()                │
│ # Uses: FLAT index, 512MB threshold           │
│                                                │
│                                                │
│ Option 2: Production Scale                    │
│ ───────────────────────────────────────────   │
│ manager = AxiomMemoryManager(                 │
│     redis_url="redis://prod:6379"             │
│ )                                             │
│ manager.vector_memory.index_algorithm="HNSW"  │
│ manager.vector_memory.memory_threshold_mb=2GB │
│                                                │
│                                                │
│ Option 3: Disable Memory (Testing)            │
│ ───────────────────────────────────────────   │
│ # In graph_utils.py:                          │
│ MEMORY_AVAILABLE = False                      │
│ # Pipeline runs without memory                │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Request/Response Pattern

### Request: process_verdict()

```json
{
  "user_profile": "senior backend engineer",
  "topic": "kubernetes adoption",
  "verdict_data": {
    "verdict": "pursue",
    "confidence": "high",
    "reasoning": "Production-ready, strong adoption"
  },
  "signal_data": {
    "status": "ok",
    "user_context_summary": "senior backend engineer"
  },
  "reality_check_data": {
    "market_signal": "strong",
    "hype_score": 4,
    "risk_factors": ["steep learning curve"]
  },
  "pipeline_state": {
    "contract_violation": false
  }
}
```

### Response: process_verdict()

```json
{
  "user_id": "axiom_user_abc123def456",
  "memory_stored": true,
  "details": {
    "user_traits": [
      {
        "trait": "stability_focus",
        "description": "Prefers stable, reliable, production-ready solutions",
        "confidence": 0.87
      }
    ],
    "topic_patterns": [
      {
        "pattern": "production_ready",
        "description": "Widely adopted in production (hype: 4/10)",
        "confidence": 0.92
      }
    ],
    "decision_stored": true,
    "decision_id": "axiom:decision:user123:abc123def",
    "reasons": {
      "user": "approved",
      "topic": "approved",
      "decision": "approved",
      "violation": null,
      "memory": null
    },
    "metrics": {
      "writes": 2,
      "reads": 0,
      "search_queries": 0,
      "encoding_errors": 0,
      "vector_mismatches": 0
    }
  }
}
```

---

## Safety Gates Diagram

```
┌─────────────────────────────────────────────────────┐
│         MEMORY WRITE SAFETY GATES                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Incoming Verdict                                  │
│         ↓                                           │
│  ┌──────────────────────────┐                      │
│  │ Gate 1: Memory Check     │  ← NEW               │
│  │ Is Redis memory < limit? │                      │
│  │ YES ↓ | NO → REJECT      │                      │
│  └──────────────────────────┘                      │
│         ↓                                           │
│  ┌──────────────────────────┐                      │
│  │ Gate 2: Contract Check   │  ← NEW               │
│  │ Is verdict consistent?   │                      │
│  │ YES ↓ | NO → REJECT      │                      │
│  └──────────────────────────┘                      │
│         ↓                                           │
│  ┌──────────────────────────┐                      │
│  │ Gate 3: Policy Check     │  (existing)          │
│  │ Does policy allow write? │                      │
│  │ YES ↓ | NO → SKIP        │                      │
│  └──────────────────────────┘                      │
│         ↓                                           │
│  ┌──────────────────────────┐                      │
│  │ Gate 4: Idempotency      │  ← NEW               │
│  │ Is this a duplicate?     │                      │
│  │ YES ↓ Return existing    │                      │
│  │ NO ↓ Store new           │                      │
│  └──────────────────────────┘                      │
│         ↓                                           │
│  ┌──────────────────────────┐                      │
│  │ Gate 5: Encoding         │  ← NEW (auto)        │
│  │ encode_vec() validates   │                      │
│  │ YES ↓ | NO → Safe error  │                      │
│  └──────────────────────────┘                      │
│         ↓                                           │
│  ✅ Store in Redis (safe)                          │
│         ↓                                           │
│  Return: {stored, metrics}                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## File Dependency Graph

```
app.py / axiom_with_memory.py
        ↓
graph_utils.py
        ├─ from memory.manager import AxiomMemoryManager
        ├─ from memory.integration import get_memory_manager
        │
        └─→ manager.py (AxiomMemoryManager)
            ├─ from .redis_vector import RedisVectorMemory
            ├─ from .policy import MemoryPolicyEngine
            └─ from .schemas import (MemoryWriteContext, MemoryContext)
                │
                └─→ redis_vector.py (RedisVectorMemory) ← ENHANCED
                    ├─ from .schemas import (MemoryWriteContext, MemoryContext)
                    ├─ from .policy import MemoryPolicyEngine
                    └─ Redis Stack (docker container)

integration.py
        ├─ from .manager import AxiomMemoryManager
        └─ Singleton pattern to get memory manager

schemas.py
        ├─ MemoryWriteContext (input to process_verdict)
        ├─ MemoryContext (output from get_memory_context)
        └─ Used by both manager.py and redis_vector.py

policy.py
        ├─ MemoryPolicyEngine (quality gates)
        └─ Used by redis_vector.py for write decisions
```

---

## Summary: Clean Architecture ✅

```
Your Agent (LLM Pipeline)
         │
         ├─ DECOUPLED from memory system
         ├─ Can disable memory: MEMORY_AVAILABLE = False
         ├─ Can replace manager: Swap AxiomMemoryManager
         │
         └─→ Memory Manager (orchestrator)
             │
             ├─ DECOUPLED from Redis implementation
             ├─ Can swap RedisVectorMemory for alternative
             │
             └─→ Redis Vector Memory (implementation)
                 │
                 ├─ Uses Redis Stack (docker)
                 ├─ 8 improvements for production
                 ├─ 100% backward compatible
                 ├─ Fully configurable
                 └─ Optional quality gates
```

**Result: Professional, maintainable, scalable architecture** 🎯
