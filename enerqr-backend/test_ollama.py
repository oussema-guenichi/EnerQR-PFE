import httpx, json

payload = {
    "model": "tinyllama:latest",
    "prompt": "Say hello briefly.",
    "stream": False
}

print("Testing Ollama...")
response = httpx.post("http://localhost:11434/api/generate", json=payload, timeout=60.0)
print(f"Status: {response.status_code}")
print(f"Response: {response.text[:500]}")
