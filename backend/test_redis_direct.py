
import redis
import os
from redis.commands.search.query import Query

def test_redis():
    print("Direct Redis Search Check...")
    r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=False)
    
    try:
        query = Query("*").paging(0, 1)
        results = r.ft("idx:axiom:interactions").search(query)
        
        if results.total > 0:
            doc = results.docs[0]
            print(f"Doc ID: {doc.id}")
            print(f"Fields in doc.__dict__:")
            for k, v in doc.__dict__.items():
                v_type = type(v).__name__
                if isinstance(v, bytes):
                    print(f"  - {k} ({v_type}): [LENGTH {len(v)}]")
                else:
                    # Safe print for non-bytes
                    v_str = str(v).encode('ascii', 'ignore').decode('ascii')
                    print(f"  - {k} ({v_type}): {v_str[:50]}...")
                    
    except Exception as e:
        print(f"Search failed: {e}")

if __name__ == "__main__":
    test_redis()
