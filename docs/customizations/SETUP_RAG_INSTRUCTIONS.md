# RAG Setup Instructions

## ✅ What's Already Done

Your RAG system is **90% complete**! Here's what's working:

1. ✅ Backend API is running on http://localhost:8001
2. ✅ Database with pgvector extension configured
3. ✅ Document embeddings generated for your invoices
4. ✅ Semantic search working perfectly
5. ✅ RAG endpoint responding with relevant chunks

## 🔑 What You Need: OpenAI API Key

To get **GPT-4o powered intelligent responses** instead of template-based responses:

### Step 1: Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign up or log in to your OpenAI account
3. Add at least **$5** to your account (required minimum)
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-proj-...` or `sk-...`)

### Step 2: Update Your .env File

1. Open: `pie-docs-backend\.env`
2. Find line 5: `OPENAI_API_KEY=your-openai-api-key-here`
3. Replace with your actual key:
   ```
   OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
   ```
4. Save the file

### Step 3: Restart the Backend

```bash
cd pie-docs-backend
# The server will auto-reload if uvicorn is still running with --reload
# Otherwise, restart it:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## 🧪 Test Your RAG

### Test via API (Command Line)

```bash
curl -X POST "http://localhost:8001/api/v1/search/rag" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"What invoices do we have?\", \"top_k\": 5}"
```

### Test via Frontend

1. Make sure frontend is running on http://localhost:3001
2. Go to: http://localhost:3001/search
3. Click on the **"Semantic Search"** tab
4. Ask a question like:
   - "What invoices do we have and what are the amounts?"
   - "Show me all Google invoices"
   - "What was the total amount spent on Envato purchases?"

## 💰 GPT-4o Pricing (Very Affordable!)

- **$5** per 1 million input tokens
- **$15** per 1 million output tokens
- For typical queries: **~$0.001 per question** (less than 1 cent!)

Example: With $5, you can ask approximately **5,000 questions**

## 🔄 Alternative: Use Free Local LLM (Ollama)

If you don't want to use OpenAI, you can use **Ollama** for free:

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. Update `.env`:
   ```
   LLM_PROVIDER=ollama
   OLLAMA_MODEL=llama3.2
   ```
4. Restart backend

## 📊 Current System Status

Your system is using **sentence-transformers** for embeddings (FREE and LOCAL):
- Model: `all-MiniLM-L6-v2`
- No API costs for embeddings
- Only need OpenAI for response generation

## ✨ What You'll Get with GPT-4o

**Before (Template-based):**
```
Based on the available documents:
From 'IVIP46937773.pdf':
Envato Market Invoice...
```

**After (GPT-4o powered):**
```
You have 3 invoices in your system:

1. **Envato Invoice (IVP46937773)** - $44.00 USD
   - Date: March 10, 2022
   - WooCommerce Food plugin purchase

2. **Envato Invoice (IVP50469986)** - $39.00 USD
   - Date: March 30, 2023
   - Openpos POS system purchase

3. **Google Workspace Invoice (4904129981)** - ₹1,302.72 INR (~$15.60 USD)
   - Date: January 31, 2024
   - Google Workspace Business Starter subscription

**Total: ~$98.60 USD**
```

## 🐛 Troubleshooting

### "Authentication error" when testing
→ Your API key is invalid or expired. Get a new one from OpenAI.

### "Insufficient funds" error
→ Add at least $5 to your OpenAI account.

### Frontend still shows "demo mode"
→ Clear browser cache or check browser console for errors (F12)

### Backend not connecting
→ Make sure backend is running: `curl http://localhost:8001/health`

## 🎉 Next Steps

1. Get your OpenAI API key
2. Update `.env` file
3. Restart backend (if needed)
4. Test at http://localhost:3001/search
5. Enjoy intelligent document search! 🚀

---

**Need help?** Check the logs:
- Backend logs: Look at the terminal running uvicorn
- Frontend logs: Open browser DevTools (F12) → Console tab
