"""
Diagnostic script to check LLM service initialization
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 80)
print("LLM Service Initialization Diagnostics")
print("=" * 80)

# Check environment variables
print("\n[1] Environment Variables")
print("-" * 80)
print(f"LLM_PROVIDER: '{os.getenv('LLM_PROVIDER', 'NOT_SET')}'")
print(f"OPENAI_MODEL: '{os.getenv('OPENAI_MODEL', 'NOT_SET')}'")
api_key = os.getenv('OPENAI_API_KEY', 'NOT_SET')
print(f"OPENAI_API_KEY: '{api_key[:20]}...' (length: {len(api_key) if api_key != 'NOT_SET' else 0})")

# Check settings module
print("\n[2] Settings Module")
print("-" * 80)
try:
    from app.config import settings
    print(f"settings.OPENAI_API_KEY: '{settings.OPENAI_API_KEY[:20] if settings.OPENAI_API_KEY else 'NONE'}...'")
    print(f"API key from settings length: {len(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else 0}")
except Exception as e:
    print(f"Error loading settings: {e}")

# Try to import and check llm_service
print("\n[3] LLM Service Import")
print("-" * 80)
try:
    from app.llm_service import llm_service

    print(f"Provider: {llm_service.provider}")
    print(f"Model: {llm_service.model}")
    print(f"Client: {llm_service.client}")
    print(f"Is Available: {llm_service.is_available()}")

    provider_info = llm_service.get_provider_info()
    print(f"\nProvider Info:")
    for key, value in provider_info.items():
        print(f"  {key}: {value}")

except Exception as e:
    print(f"Error importing llm_service: {e}")
    import traceback
    traceback.print_exc()

# Try direct OpenAI initialization
print("\n[4] Direct OpenAI Test")
print("-" * 80)
try:
    from openai import OpenAI

    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        client = OpenAI(api_key=api_key)
        print(f"✓ OpenAI client created successfully")
        print(f"✓ API Key length: {len(api_key)}")

        # Try a simple API call
        model = os.getenv('OPENAI_MODEL', 'gpt-5-nano')
        print(f"✓ Testing with model: {model}")

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say 'Working!'"}],
            max_completion_tokens=10
        )

        print(f"✓ API call successful!")
        print(f"✓ Response: {response.choices[0].message.content}")
        print(f"✓ Model used: {response.model}")
    else:
        print("✗ No API key found in environment")

except Exception as e:
    print(f"✗ Error: {e}")

print("\n" + "=" * 80)
print("Diagnostics Complete")
print("=" * 80)
