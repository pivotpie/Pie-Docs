"""Test which GPT-5 models are available with the API key"""
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

models_to_test = [
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-5-chat-latest'
]

print("="*60)
print("Testing GPT-5 Model Availability")
print("="*60)

for model_name in models_to_test:
    print(f"\nTesting: {model_name}")
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Say 'Working!' in one word"}
            ],
            max_completion_tokens=5
        )

        answer = response.choices[0].message.content
        tokens = response.usage.total_tokens

        if answer and answer.strip():
            print(f"  SUCCESS: '{answer}'")
            print(f"  Tokens: {tokens}")
        else:
            print(f"  WARNING: Empty response (might not be available)")

    except Exception as e:
        error_msg = str(e)
        if "model_not_found" in error_msg or "does not exist" in error_msg:
            print(f"  NOT AVAILABLE: Model doesn't exist")
        elif "insufficient_quota" in error_msg:
            print(f"  QUOTA ERROR: Need to add funds")
        else:
            print(f"  ERROR: {error_msg[:100]}")

print("\n" + "="*60)
print("Recommendation: Use the model that returned a valid response")
print("="*60)
