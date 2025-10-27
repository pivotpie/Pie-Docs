#!/usr/bin/env python3
"""
Enable LLM for RAG System
Updates .env file with OpenAI configuration
"""

import os
import sys

def update_env_file(api_key):
    """Update .env file with OpenAI API key and enable LLM provider"""
    env_path = '.env'

    if not os.path.exists(env_path):
        print(f"❌ Error: {env_path} not found!")
        return False

    # Read current .env file
    with open(env_path, 'r') as f:
        lines = f.readlines()

    # Update relevant lines
    updated_lines = []
    for line in lines:
        if line.startswith('OPENAI_API_KEY='):
            updated_lines.append(f'OPENAI_API_KEY={api_key}\n')
            print(f"✅ Updated OPENAI_API_KEY")
        elif line.startswith('LLM_PROVIDER='):
            updated_lines.append('LLM_PROVIDER=openai\n')
            print(f"✅ Set LLM_PROVIDER=openai")
        else:
            updated_lines.append(line)

    # Write back to .env
    with open(env_path, 'w') as f:
        f.writelines(updated_lines)

    print(f"\n✅ .env file updated successfully!")
    return True

def verify_openai_key(api_key):
    """Verify OpenAI API key is valid"""
    if not api_key or len(api_key) < 20:
        return False
    if not api_key.startswith('sk-'):
        return False
    return True

def main():
    print("="*60)
    print("  Enable OpenAI LLM for RAG System")
    print("="*60)

    # Check if API key provided as argument
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
    else:
        # Prompt for API key
        print("\nPlease enter your OpenAI API key:")
        print("(It should start with 'sk-')")
        api_key = input("API Key: ").strip()

    # Verify API key format
    if not verify_openai_key(api_key):
        print("\n❌ Error: Invalid API key format!")
        print("   API key should start with 'sk-' and be at least 20 characters")
        return 1

    # Update .env file
    if not update_env_file(api_key):
        return 1

    print("\n" + "="*60)
    print("  LLM Configuration Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Restart the backend server:")
    print("   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
    print("\n2. Test LLM is working:")
    print("   curl -X POST http://localhost:8001/api/v1/rag/query \\")
    print('     -H "Content-Type: application/json" \\')
    print('     -d \'{"query": "What is intelligent document processing?"}\'')
    print("\n3. Look for this in backend logs:")
    print("   'Generated LLM response using openai'")
    print("\n" + "="*60)

    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
