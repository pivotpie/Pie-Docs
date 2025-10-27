"""Check what the backend actually sees"""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("\n" + "="*60)
print("Backend Environment Check")
print("="*60)

# Check all relevant env vars
vars_to_check = [
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'LLM_PROVIDER',
    'EMBEDDING_MODEL'
]

for var in vars_to_check:
    value = os.getenv(var, 'NOT_SET')
    if var == 'OPENAI_API_KEY' and value != 'NOT_SET':
        print(f"{var}: {value[:20]}...{value[-10:]} (length: {len(value)})")
    else:
        print(f"{var}: {value}")

print("="*60)

# Try to initialize LLM service
print("\nTrying to initialize LLM service...")
try:
    from app.llm_service import llm_service
    print(f"Provider: {llm_service.provider}")
    print(f"Model: {llm_service.model}")
    print(f"Client: {llm_service.client}")
    print(f"Available: {llm_service.is_available()}")

    if llm_service.is_available():
        print("\n✅ LLM Service is ready!")
    else:
        print("\n❌ LLM Service NOT initialized!")
        print("Check backend startup logs for errors")

except Exception as e:
    print(f"❌ Error loading LLM service: {e}")
    import traceback
    traceback.print_exc()

print("="*60 + "\n")
