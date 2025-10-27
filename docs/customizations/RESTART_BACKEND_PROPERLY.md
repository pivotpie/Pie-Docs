# ⚠️ Backend Needs Full Restart

## Problem Identified
The running uvicorn server has a **cached LLM service instance** from before the API key was added.

Fresh Python load shows:
```
✓ OPENAI_API_KEY: Loaded (164 chars)
✓ Provider: openai
✓ Model: gpt-5-nano
✓ Client: Initialized
✓ Available: True
```

But the running server still uses template responses because it's using the OLD cached instance!

## Solution: Full Backend Restart

### Step 1: Stop Backend Completely
```bash
# In the terminal running uvicorn, press:
Ctrl + C

# Wait for "Shutting down" message
# Make sure it fully stops
```

### Step 2: Start Backend Fresh
```bash
cd pie-docs-backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Step 3: Verify It Works
```bash
# Open a new terminal and run:
cd pie-docs-backend
python check_backend_env.py
```

Expected output:
```
Provider: openai
Model: gpt-5-nano
Client: <openai.OpenAI object...>
Available: True
```

### Step 4: Test GPT-5-nano
```bash
curl -X POST http://localhost:8001/api/v1/search/rag \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"Do we have an invoice for Openpos?\", \"top_k\": 5}"
```

**Expected**: Curated GPT-5-nano response (NOT template with "Note: For more...")

---

## Why Auto-Reload Didn't Work

Uvicorn's `--reload` watches for FILE changes, but:
1. `.env` changes don't trigger reload
2. Global singleton `llm_service` was already initialized
3. Module import cache keeps old instance

**Full restart** clears everything and loads fresh!

---

## After Restart

1. ✅ Backend will use GPT-5-nano
2. ✅ RAG will give curated answers
3. ✅ Then restart frontend (or hard refresh browser)
4. ✅ Test at http://localhost:3001/search

**You're one restart away from working GPT-5-nano!** 🚀
