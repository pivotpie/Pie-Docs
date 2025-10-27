"""Test if LLM is actually working with the current configuration"""
import os
from dotenv import load_dotenv

load_dotenv()

print("="*60)
print("Direct LLM Test")
print("="*60)

# Check environment
key = os.getenv('OPENAI_API_KEY', '')
model = os.getenv('OPENAI_MODEL', 'gpt-4o')
provider = os.getenv('LLM_PROVIDER', 'none')

print(f"Provider: {provider}")
print(f"Model: {model}")
print(f"Key length: {len(key)}")
print(f"Key starts: {key[:15] if key else 'MISSING'}")

# Try direct OpenAI call
if key and len(key) > 20:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=key)

        print("\nTesting direct OpenAI call...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'GPT-5-nano is working!' in 5 words or less."}
            ],
            max_completion_tokens=20
        )

        answer = response.choices[0].message.content
        print(f"SUCCESS: {answer}")
        print(f"Tokens: {response.usage.total_tokens}")

    except Exception as e:
        print(f"ERROR: {e}")
else:
    print("\nERROR: No API key found!")

print("="*60)
