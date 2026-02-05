# test_import.py
try:
    from redis.commands.search.field import VectorField, TagField, TextField
    from redis.commands.search.index_definition import IndexDefinition, IndexType
    from redis.commands.search.query import Query

    print(
        "✅ SUCCESS! Modern `redis` package with search support is correctly installed."
    )
    print(f"✅ You can now import: VectorField, IndexDefinition, Query, etc.")
except ImportError as e:
    print(f"❌ Import failed: {e}")
