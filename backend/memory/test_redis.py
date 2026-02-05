import redis

# Test connection
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

try:
    response = r.ping()
    print(f"✅ Redis is alive: {response}")

    # Test basic operations
    r.set("test_key", "Hello Redis!")
    value = r.get("test_key")
    print(f"✅ Set/get test: {value}")

    # Test list operations (what we'll use for memory)
    r.lpush("test_list", "item1", "item2", "item3")
    items = r.lrange("test_list", 0, -1)
    print(f"✅ List test: {items}")

    # Cleanup
    r.delete("test_key", "test_list")
    print("✅ Cleanup done")

except redis.ConnectionError as e:
    print(f"❌ Connection failed: {e}")
    print("\nTroubleshooting:")
    print("1. Is Redis running? Check: docker ps")
    print("2. Start Redis: docker start axiom-redis")
    print("3. If docker not running: docker run -d -p 6379:6379 redis:alpine")
except Exception as e:
    print(f"❌ Error: {e}")
