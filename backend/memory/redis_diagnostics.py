import redis
import json

print('=== Python redis-py diagnostics connecting to redis://localhost:6379 ===')
try:
    c = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)
    info = c.info()
    print('INFO server:', info.get('redis_version', 'unknown'))
    print('INFO role:', info.get('role', 'unknown'))
except Exception as e:
    print('INFO error:', repr(e))

try:
    modules = c.execute_command('MODULE', 'LIST')
    print('MODULE LIST (via redis-py):')
    print(json.dumps(modules, default=str, indent=2))
except Exception as e:
    print('MODULE LIST error (via redis-py):', repr(e))

print('\n=== Host redis-cli diagnostics on port 6379 ===')
import subprocess, sys

def run(cmd):
    try:
        out = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True)
        print(out)
    except subprocess.CalledProcessError as e:
        print('Command failed:', cmd)
        print(e.output)

run('redis-cli -p 6379 INFO server')
run('redis-cli -p 6379 MODULE LIST')

print('\n=== Inside Docker container axiom-vectordb ===')
run('docker exec -it axiom-vectordb redis-cli INFO server')
run('docker exec -it axiom-vectordb redis-cli MODULE LIST')
