# ⚠️ ACTION REQUIRED: Add Your OpenAI API Key

## Current Issue
Your `.env` file has a placeholder instead of a real API key:
```
OPENAI_API_KEY=your-openai-api-key-here
```

## ✅ How to Fix (2 minutes)

### Step 1: Get Your OpenAI API Key
1. Go to: https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-proj-...` or `sk-...`)

### Step 2: Add $5 to Your Account
- Go to: https://platform.openai.com/settings/organization/billing
- Click **"Add payment method"**
- Add minimum **$5** (required for API access)

### Step 3: Update Your `.env` File
1. Open: `pie-docs-backend\.env`
2. Replace line 8:
   ```bash
   # BEFORE:
   OPENAI_API_KEY=your-openai-api-key-here

   # AFTER:
   OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
   ```
3. Save the file

### Step 4: Restart Backend
The backend will auto-reload, but to ensure it picks up the new key:
```bash
# Stop the current backend (Ctrl+C in the terminal)
# Then restart:
cd pie-docs-backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## ✅ Test It Works

```bash
curl -X POST http://localhost:8001/api/v1/search/rag \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"Do we have an invoice for openpos?\", \"top_k\": 5}"
```

**Expected Response** (with GPT-5-nano):
```json
{
  "answer": "Yes, you have an invoice for Openpos (Invoice #IVP50469986) dated March 30, 2023, totaling $39.00 USD. It includes a Regular License ($24.37) and 6-month support ($14.63).",
  "confidence": 0.53,
  "sources": [...]
}
```

## 💰 GPT-5-nano Pricing
- **Input**: $0.05 per 1M tokens
- **Output**: $0.40 per 1M tokens
- **Per Query**: ~$0.0001 (0.01 cents!)
- **$5 Gets You**: ~50,000 queries!

## 🐛 Troubleshooting

### "Authentication Error"
→ API key is invalid. Get a new one from OpenAI.

### "Insufficient Funds"
→ Add $5 minimum to your OpenAI account.

### "Model not found: gpt-5-nano"
→ Make sure you have API access. Check https://platform.openai.com/account/limits

### Backend Still Shows Template Responses
→ Restart the backend to pick up the new key.

---

**Once you add your key, the system will generate intelligent, curated responses instead of raw data dumps!** 🚀
