from tools.web_search import WebSearchTool
from dotenv import load_dotenv
import os

load_dotenv()

def test_search():
    tool = WebSearchTool()
    topic = "LangGraph state management best practices 2024"
    print(f"Testing search for: {topic}")
    
    result = tool.execute(topic)
    
    print(f"\nProvider Used: {result.structured_data.get('provider')}")
    print(f"Confidence: {result.confidence}")
    print(f"Results Found: {len(result.structured_data.get('sources', []))}")
    
    for i, source in enumerate(result.structured_data.get('sources', []), 1):
        print(f"\n--- Source {i} ({source.get('source')}) ---")
        print(f"Title: {source.get('title')}")
        print(f"URL: {source.get('url')}")
        print(f"Snippet: {source.get('snippet')[:100]}...")
        print(f"Domain: {source.get('domain')}")
        print(f"Date: {source.get('date')}")

if __name__ == "__main__":
    test_search()
