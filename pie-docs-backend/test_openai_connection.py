"""
Test OpenAI API Connection
Quick script to verify your API key works with GPT-5-nano
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_key = os.getenv('OPENAI_API_KEY', '')
model = os.getenv('OPENAI_MODEL', 'gpt-5-nano')

print("\n" + "="*70)
print("OpenAI API Connection Test")
print("="*70)

# Check if API key is configured
if not api_key or api_key == "your-openai-api-key-here":
    print("\n❌ ERROR: OpenAI API key not configured!")
    print("\n📋 Quick Setup:")
    print("   1. Get key: https://platform.openai.com/api-keys")
    print("   2. Add $5 minimum to your account")
    print("   3. Edit pie-docs-backend\\.env line 8")
    print("   4. Replace: OPENAI_API_KEY=your-openai-api-key-here")
    print("   5. With: OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE")
    print("   6. Restart backend\n")
    print("="*70 + "\n")
    exit(1)

print(f"\n✅ API Key: Found (length: {len(api_key)} chars)")
print(f"   Preview: {api_key[:15]}...{api_key[-10:]}")
print(f"\n📊 Model: {model}")

# Try to connect to OpenAI
print("\n🔄 Testing connection to OpenAI API...")

try:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    # Simple test query
    print("   Sending test query...")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": "Say 'Hello' in 5 words or less"}
        ],
        max_tokens=50
    )

    answer = response.choices[0].message.content

    print("\n✅ SUCCESS! OpenAI API is working!")
    print(f"   Model: {model}")
    print(f"   Response: {answer}")
    print(f"   Tokens used: {response.usage.total_tokens}")

    # Calculate cost
    input_cost = response.usage.prompt_tokens * 0.05 / 1_000_000
    output_cost = response.usage.completion_tokens * 0.40 / 1_000_000
    total_cost = input_cost + output_cost

    print(f"   Cost: ${total_cost:.6f} (~{total_cost*100000:.2f} cents)")

    print("\n🎉 Your RAG system is ready to use GPT-5-nano!")
    print("   Go to: http://localhost:3001/search")
    print("   Click 'Semantic Search' tab and ask questions!")

except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    print("\n🔧 Common Issues:")
    print("   • Invalid API key → Get new one from OpenAI")
    print("   • Insufficient funds → Add $5 to your account")
    print("   • Model not available → Check your API access")
    print("   • Rate limit → Wait a moment and try again")

print("\n" + "="*70 + "\n")
