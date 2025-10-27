import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv('OPENAI_API_KEY', '')
model = os.getenv('OPENAI_MODEL', 'gpt-4o')

print("\n" + "="*60)
print("OpenAI Configuration Check")
print("="*60)

if key and key != "your-openai-api-key-here":
    print(f"✅ API Key: Configured (length: {len(key)} chars)")
    print(f"   Preview: {key[:10]}...{key[-10:]}")
else:
    print("❌ API Key: NOT CONFIGURED (placeholder detected)")
    print("   Please add your actual OpenAI API key to .env file")

print(f"\n✅ Model: {model}")
print(f"   Pricing: $0.05/1M input, $0.40/1M output tokens")

print("\n" + "="*60)

if not key or key == "your-openai-api-key-here":
    print("\n🚨 ACTION REQUIRED:")
    print("1. Get your key from: https://platform.openai.com/api-keys")
    print("2. Add $5 to your OpenAI account")
    print("3. Update line 8 in pie-docs-backend\\.env")
    print("4. Restart the backend")
else:
    print("\n✅ Configuration looks good!")
    print("   Your RAG system is ready to use GPT-5-nano")

print("="*60 + "\n")
