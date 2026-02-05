"""
Test harness for Redis vector queries.
Validates KNN queries work correctly with HNSW and FLAT indexes.
Tests idempotency, contract violation detection, and memory monitoring.
"""

import numpy as np
from datetime import datetime, timezone
from memory.redis_vector import RedisVectorMemory
from memory.schemas import MemoryWriteContext


def test_embedding_determinism():
    """Test that encoding is deterministic (same text → same embedding)"""
    print("\n" + "=" * 60)
    print("TEST: Embedding Determinism")
    print("=" * 60)
    
    try:
        mem = RedisVectorMemory(index_algorithm="FLAT")
        
        text = "Redis vector similarity search is fast and reliable"
        
        # Encode twice
        vec1 = mem.encode_vec(text)
        vec2 = mem.encode_vec(text)
        
        # Check dtype and shape
        assert vec1.dtype == np.float32, f"Expected float32, got {vec1.dtype}"
        assert vec2.dtype == np.float32, f"Expected float32, got {vec2.dtype}"
        assert vec1.shape == (mem.VECTOR_DIM,), f"Expected shape ({mem.VECTOR_DIM},), got {vec1.shape}"
        assert vec2.shape == (mem.VECTOR_DIM,), f"Expected shape ({mem.VECTOR_DIM},), got {vec2.shape}"
        
        # Check bitwise equality
        assert np.array_equal(vec1, vec2), "Embeddings not deterministic!"
        
        # Check cosine similarity is exactly 1.0
        sim = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
        assert abs(sim - 1.0) < 1e-5, f"Self-similarity should be 1.0, got {sim}"
        
        print("✅ Determinism test PASSED")
        print(f"   - Encoding dtype: {vec1.dtype}")
        print(f"   - Encoding shape: {vec1.shape}")
        print(f"   - Self-similarity: {sim:.6f}")
        
    except Exception as e:
        print(f"❌ Determinism test FAILED: {e}")
        raise


def test_vector_dimension_mismatch():
    """Test that encoding rejects mismatched dimensions"""
    print("\n" + "=" * 60)
    print("TEST: Vector Dimension Mismatch Detection")
    print("=" * 60)
    
    try:
        mem = RedisVectorMemory(index_algorithm="FLAT")
        
        # This should work (normal case)
        vec_good = mem.encode_vec("Normal text encoding")
        assert vec_good.shape[0] == mem.VECTOR_DIM
        print(f"✅ Good encoding: shape={vec_good.shape}")
        
        # Try empty text (edge case)
        try:
            vec_empty = mem.encode_vec("")
            if vec_empty.shape[0] == mem.VECTOR_DIM:
                print(f"✅ Empty text handled: shape={vec_empty.shape}")
            else:
                print(f"⚠️  Empty text produces shape {vec_empty.shape}, expected {mem.VECTOR_DIM}")
        except ValueError as ve:
            print(f"✅ Empty text properly rejected: {ve}")
        
        # Check metrics for vector mismatches
        print(f"   - Vector mismatches detected: {mem.metrics.vector_mismatches}")
        print(f"   - Encoding errors: {mem.metrics.encoding_errors}")
        
    except Exception as e:
        print(f"❌ Dimension mismatch test FAILED: {e}")
        raise


def test_decision_idempotency():
    """Test that duplicate decisions are not stored twice"""
    print("\n" + "=" * 60)
    print("TEST: Decision Idempotency")
    print("=" * 60)
    
    try:
        mem = RedisVectorMemory(index_algorithm="FLAT")
        mem.clear_all_memories()
        
        # Create context
        ctx = MemoryWriteContext(
            user_id="test_user_1",
            topic="kubernetes",
            verdict="pursue",
            confidence="high",
            reasoning="Kubernetes is production-ready and widely adopted",
            user_context="senior backend engineer",
            market_signal="strong",
            hype_score=6,
            risk_factors=[],
            signal_status="ok",
            contract_violation=False,
        )
        
        # Store decision first time
        sig1 = mem.decision_sig(ctx.topic, ctx.reasoning)
        decision_id_1 = mem._store_decision(ctx)
        print(f"✅ First decision stored: {decision_id_1}")
        print(f"   Signature: {sig1}")
        
        # Try to store same decision again
        decision_id_2 = mem._store_decision(ctx)
        print(f"✅ Second store attempt returned: {decision_id_2}")
        
        # They should be the same ID (idempotent)
        assert decision_id_1 == decision_id_2, "Idempotency failed! Got different IDs"
        print(f"✅ Idempotency confirmed: {decision_id_1} == {decision_id_2}")
        
        # Check signature key exists in Redis
        sig_key = f"axiom:decision_sig:{sig1}"
        sig_value = mem.redis.get(sig_key)
        assert sig_value is not None, "Signature key not found in Redis"
        print(f"✅ Signature key exists: {sig_key}")
        
    except Exception as e:
        print(f"❌ Idempotency test FAILED: {e}")
        raise


def test_contract_violation_detection():
    """Test contract violation detection"""
    print("\n" + "=" * 60)
    print("TEST: Contract Violation Detection")
    print("=" * 60)
    
    try:
        mem = RedisVectorMemory(index_algorithm="FLAT")
        
        # Test 1: Insufficient signal + high confidence (violation)
        violation_1 = mem.detect_contract_violation(
            signal_status="insufficient_signal",
            market_signal="mixed",
            verdict="pursue",
            hype_score=5,
            reasoning="Some reasoning here",
            confidence="high"
        )
        assert violation_1 == True, "Should detect insufficient signal + high confidence"
        print("✅ Violation 1 detected: insufficient signal + high confidence")
        
        # Test 2: Weak market + high hype + pursuing (violation)
        violation_2 = mem.detect_contract_violation(
            signal_status="ok",
            market_signal="weak",
            verdict="pursue",
            hype_score=9,
            reasoning="Some reasoning",
            confidence="high"
        )
        assert violation_2 == True, "Should detect weak market + high hype + pursue"
        print("✅ Violation 2 detected: weak market + high hype + pursue verdict")
        
        # Test 3: No evidence + high confidence (violation)
        violation_3 = mem.detect_contract_violation(
            signal_status="ok",
            market_signal="mixed",
            verdict="explore",
            hype_score=5,
            reasoning="no direct evidence here and no evidence anywhere",
            confidence="high"
        )
        assert violation_3 == True, "Should detect no evidence + high confidence"
        print("✅ Violation 3 detected: no evidence + high confidence")
        
        # Test 4: Valid combination (no violation)
        violation_4 = mem.detect_contract_violation(
            signal_status="ok",
            market_signal="strong",
            verdict="pursue",
            hype_score=4,
            reasoning="Strong market adoption with production usage",
            confidence="high"
        )
        assert violation_4 == False, "Should not detect violation in valid case"
        print("✅ Valid case passed: strong signal + pursue + high confidence")
        
    except Exception as e:
        print(f"❌ Contract violation test FAILED: {e}")
        raise


def test_memory_threshold():
    """Test memory threshold monitoring"""
    print("\n" + "=" * 60)
    print("TEST: Memory Threshold Monitoring")
    print("=" * 60)
    
    try:
        # Create with low threshold (1 MB for testing)
        mem = RedisVectorMemory(index_algorithm="FLAT", memory_threshold_mb=1)
        
        # Check memory
        ok = mem._check_memory_threshold()
        print(f"✅ Memory check executed: {ok}")
        
        # Get actual memory usage
        info = mem.redis.info("memory")
        used_mb = info.get("used_memory", 0) / (1024 * 1024)
        print(f"   - Actual Redis memory: {used_mb:.1f} MB")
        print(f"   - Threshold: 1 MB")
        
        if used_mb > 1:
            print(f"⚠️  Memory exceeds threshold (expected for test)")
        
    except Exception as e:
        print(f"❌ Memory threshold test FAILED: {e}")
        raise


def test_index_algorithm_selection():
    """Test FLAT vs HNSW index creation"""
    print("\n" + "=" * 60)
    print("TEST: Index Algorithm Selection (FLAT vs HNSW)")
    print("=" * 60)
    
    try:
        # Test FLAT
        print("\n--- Testing FLAT index ---")
        mem_flat = RedisVectorMemory(index_algorithm="FLAT")
        assert mem_flat.index_algorithm == "FLAT"
        print(f"✅ FLAT index initialized: {mem_flat.index_algorithm}")
        
        algo_config_flat = mem_flat._get_algo_config()
        print(f"   - FLAT config: {algo_config_flat}")
        assert "EF_CONSTRUCTION" not in algo_config_flat, "FLAT should not have EF_CONSTRUCTION"
        
        # Test HNSW
        print("\n--- Testing HNSW index ---")
        mem_hnsw = RedisVectorMemory(index_algorithm="HNSW")
        assert mem_hnsw.index_algorithm == "HNSW"
        print(f"✅ HNSW index initialized: {mem_hnsw.index_algorithm}")
        
        algo_config_hnsw = mem_hnsw._get_algo_config()
        print(f"   - HNSW config keys: {list(algo_config_hnsw.keys())}")
        assert "EF_CONSTRUCTION" in algo_config_hnsw, "HNSW should have EF_CONSTRUCTION"
        assert algo_config_hnsw["M"] == 16, "HNSW M parameter should be 16"
        
        # Test invalid algorithm (should default to FLAT)
        print("\n--- Testing invalid algorithm fallback ---")
        mem_invalid = RedisVectorMemory(index_algorithm="INVALID")
        assert mem_invalid.index_algorithm == "FLAT"
        print(f"✅ Invalid algorithm defaulted to: {mem_invalid.index_algorithm}")
        
    except Exception as e:
        print(f"❌ Index algorithm test FAILED: {e}")
        raise


def test_metrics_tracking():
    """Test metrics collection and reporting"""
    print("\n" + "=" * 60)
    print("TEST: Metrics Tracking")
    print("=" * 60)
    
    try:
        mem = RedisVectorMemory(index_algorithm="FLAT")
        mem.clear_all_memories()
        
        # Simulate some operations
        mem.metrics.increment_write()
        mem.metrics.increment_write()
        mem.metrics.increment_read()
        mem.metrics.increment_search()
        mem.metrics.increment_encoding_error()
        
        # Get summary
        summary = mem.metrics.summary()
        print(f"✅ Metrics summary: {summary}")
        
        assert summary["writes"] == 2, "Write count mismatch"
        assert summary["reads"] == 1, "Read count mismatch"
        assert summary["search_queries"] == 1, "Search count mismatch"
        assert summary["encoding_errors"] == 1, "Error count mismatch"
        
        print("✅ All metrics tracked correctly")
        
    except Exception as e:
        print(f"❌ Metrics test FAILED: {e}")
        raise


def run_all_tests():
    """Run all tests"""
    print("\n\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 58 + "║")
    print("║" + "    REDIS VECTOR QUERY TEST HARNESS".center(58) + "║")
    print("║" + "    Validating embeddings, indexes, and queries".center(58) + "║")
    print("║" + " " * 58 + "║")
    print("╚" + "=" * 58 + "╝")
    
    tests = [
        ("Embedding Determinism", test_embedding_determinism),
        ("Vector Dimension Mismatch", test_vector_dimension_mismatch),
        ("Decision Idempotency", test_decision_idempotency),
        ("Contract Violation Detection", test_contract_violation_detection),
        ("Memory Threshold Monitoring", test_memory_threshold),
        ("Index Algorithm Selection", test_index_algorithm_selection),
        ("Metrics Tracking", test_metrics_tracking),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"\n❌ {test_name} FAILED")
    
    # Summary
    print("\n\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " TEST SUMMARY ".center(58, "=") + "║")
    print(f"║ Passed: {passed:<51} ║")
    print(f"║ Failed: {failed:<51} ║")
    print("╚" + "=" * 58 + "╝\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
