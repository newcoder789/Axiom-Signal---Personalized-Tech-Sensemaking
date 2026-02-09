# Check Redis logs
docker logs axiom-redis

# Restart Redis if needed
docker restart axiom-redis

# Stop Redis
docker stop axiom-redis

# Start Redis again
docker run -d --name axiom-vectordb -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
docker start axiom-redis

# Remove Redis container (careful!)
docker rm -f axiom-redis

# Run fresh Redis with persistent volume
docker run -d \
  --name axiom-redis \
  -p 6379:6379 \
  -v axiom_redis_data:/data \
  redis:alpine redis-server --appendonly yes

# To run SQL queries:
  docker exec -it axiom_postgres psql -U axiom -d axiom_dev
  SELECT id, title, verdict FROM thoughts;

# to run docker-redis for testing
docker exec -it axiom-redis redis-cli

# get keys
keys * 

python -m uvicorn app:app --reload

docker-compose up -d