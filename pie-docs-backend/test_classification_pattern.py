"""
Test gpt-5-nano using the EXACT pattern from classification_service.py
This replicates the working implementation to identify why it succeeds.
"""
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Replicate classification_service.py pattern (line 21)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

print("="*80)
print("Testing gpt-5-nano with Classification Service Pattern")
print("="*80)

# Initialize client exactly like classification_service.py
client = OpenAI(api_key=OPENAI_API_KEY)

# Test 1: Simple text completion (like classification)
print("\n[Test 1] Simple text completion")
print("-" * 80)

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Say 'GPT-5-nano is working!' in 5 words or less."}
]

try:
    response = client.chat.completions.create(
        model="gpt-5-nano",
        messages=messages,
        max_completion_tokens=2000,  # Same as classification_service.py
        timeout=30  # Same timeout as classification_service.py
    )

    answer = response.choices[0].message.content
    tokens = response.usage.total_tokens

    print(f"SUCCESS!")
    print(f"Response: {answer}")
    print(f"Tokens: {tokens}")
    print(f"Model used: {response.model}")

except Exception as e:
    print(f"FAILED: {e}")

# Test 2: RAG-style response (like our llm_service.py)
print("\n[Test 2] RAG-style response generation")
print("-" * 80)

rag_messages = [
    {
        "role": "system",
        "content": "You are an intelligent assistant that helps users find information from documents."
    },
    {
        "role": "user",
        "content": """Based on the following document excerpts, answer the question.

Question: Do we have an invoice for Openpos?

Context:
- Document mentions "Openpos" as a client
- Invoice dated 2024-01-15
- Amount: $5000

Provide a clear, concise answer."""
    }
]

try:
    response = client.chat.completions.create(
        model="gpt-5-nano",
        messages=rag_messages,
        max_completion_tokens=2000,
        timeout=30
    )

    answer = response.choices[0].message.content
    tokens = response.usage.total_tokens

    print(f"SUCCESS!")
    print(f"Response: {answer}")
    print(f"Tokens: {tokens}")
    print(f"Model used: {response.model}")

except Exception as e:
    print(f"FAILED: {e}")

# Test 3: With temperature parameter (like llm_service.py line 157)
print("\n[Test 3] With temperature=0.3 (llm_service.py pattern)")
print("-" * 80)

try:
    response = client.chat.completions.create(
        model="gpt-5-nano",
        messages=rag_messages,
        max_completion_tokens=2000,
        temperature=0.3,  # llm_service.py includes this
        timeout=30
    )

    answer = response.choices[0].message.content
    tokens = response.usage.total_tokens

    print(f"SUCCESS!")
    print(f"Response: {answer}")
    print(f"Tokens: {tokens}")
    print(f"Model used: {response.model}")

except Exception as e:
    print(f"FAILED: {e}")

print("\n" + "="*80)
print("Analysis Complete")
print("="*80)
