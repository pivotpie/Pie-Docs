# SECRET_KEY Configuration Guide

## ✅ SECRET_KEY Already Configured

Your application now has a secure SECRET_KEY generated and configured.

---

## 🔐 What is SECRET_KEY?

The SECRET_KEY is used to:
- **Sign JWT tokens** (authentication)
- **Encrypt sensitive data**
- **Verify token authenticity**

**Critical**: Never share your SECRET_KEY publicly!

---

## ✅ Current Configuration

### Location: `pie-docs-backend/.env`

```env
SECRET_KEY=NATGo4Q9h3wkPqr5K4iiUKatIp0CFWQhQFZX2gd3SBE
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=60
MFA_CODE_EXPIRE_MINUTES=10
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30
```

### What Each Setting Means:

| Setting | Value | Description |
|---------|-------|-------------|
| SECRET_KEY | `NATGo4Q9h3w...` | **Cryptographic secret** (43 chars, URL-safe) |
| ALGORITHM | HS256 | JWT signing algorithm |
| ACCESS_TOKEN_EXPIRE_MINUTES | 15 | Token expires after 15 min |
| REFRESH_TOKEN_EXPIRE_DAYS | 7 | Refresh token valid 7 days |
| PASSWORD_RESET_TOKEN_EXPIRE_MINUTES | 60 | Reset link valid 1 hour |
| MFA_CODE_EXPIRE_MINUTES | 10 | 2FA code valid 10 min |
| MAX_LOGIN_ATTEMPTS | 5 | Lock after 5 failed logins |
| ACCOUNT_LOCKOUT_MINUTES | 30 | Lock account for 30 min |

---

## 🔧 How the SECRET_KEY Was Generated

### Method Used:
```python
import secrets
secrets.token_urlsafe(32)
# Output: NATGo4Q9h3wkPqr5K4iiUKatIp0CFWQhQFZX2gd3SBE
```

### Why This is Secure:
- ✅ **32 bytes of entropy** (256 bits)
- ✅ **Cryptographically random** (using `secrets` module)
- ✅ **URL-safe** (no special characters that break URLs)
- ✅ **Long enough** (43 characters after encoding)

---

## 🔄 Generating Your Own SECRET_KEY

### If You Need a New One:

#### Method 1: Python (Recommended)
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Method 2: OpenSSL
```bash
openssl rand -base64 32
```

#### Method 3: Python Interactive
```python
import secrets
print(secrets.token_urlsafe(32))
```

#### Method 4: Online (NOT Recommended for Production)
- Visit: https://generate-secret.vercel.app/32
- **Warning**: Only use for development, never production!

---

## 🚨 Security Best Practices

### ✅ DO:
- [x] Use cryptographically random generation
- [x] Keep SECRET_KEY in .env file (never in code)
- [x] Add .env to .gitignore (already done)
- [x] Use different keys for dev/staging/production
- [x] Rotate keys periodically (every 90 days)
- [x] Store production key in secure vault (AWS Secrets Manager, etc.)

### ❌ DON'T:
- [ ] Use simple/guessable strings
- [ ] Commit SECRET_KEY to git
- [ ] Share SECRET_KEY publicly
- [ ] Reuse same key across environments
- [ ] Use short keys (< 32 chars)
- [ ] Hard-code key in source files

---

## 🔄 Changing SECRET_KEY

### When to Change:
1. **Security breach** - Key exposed
2. **Regular rotation** - Every 90 days
3. **Environment changes** - Moving to production
4. **Team changes** - Developer leaves

### How to Change:

1. **Generate new key**:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Update .env**:
   ```env
   SECRET_KEY=<new_generated_key>
   ```

3. **Restart backend**:
   ```bash
   # Press Ctrl+C to stop
   start-backend.bat
   ```

4. **Impact**:
   - ⚠️ All existing tokens invalidated
   - ⚠️ Users must re-login
   - ✅ Enhanced security

---

## 🔍 How It's Used in Your Application

### JWT Token Creation:
```python
# When user logs in:
payload = {"user_id": user.id, "exp": expire_time}
token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
# Returns: eyJ0eXAiOiJKV1QiLCJhbGc...
```

### JWT Token Validation:
```python
# When user makes authenticated request:
try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload["user_id"]
    # Token is valid!
except jwt.InvalidTokenError:
    # Token is invalid or expired
```

---

## 📋 Configuration Hierarchy

### Priority (Highest to Lowest):

1. **`.env` file** ← **Current Setup** ✅
   ```env
   SECRET_KEY=NATGo4Q9h3wkPqr5K4iiUKatIp0CFWQhQFZX2gd3SBE
   ```

2. **`config.py` defaults** ← Fallback
   ```python
   SECRET_KEY: str = "your-secret-key-change-in-production..."
   ```

### Your Setup:
- ✅ SECRET_KEY in .env (loaded at runtime)
- ✅ Overrides config.py default
- ✅ Secure random value
- ✅ Not committed to git

---

## 🧪 Testing the Configuration

### Verify SECRET_KEY is Loaded:
```bash
cd pie-docs-backend
python -c "from app.config import settings; print('SECRET_KEY length:', len(settings.SECRET_KEY))"
```

**Expected Output**: `SECRET_KEY length: 43`

### Test JWT Token Generation:
```python
from jose import jwt
from datetime import datetime, timedelta

# Your settings
SECRET_KEY = "NATGo4Q9h3wkPqr5K4iiUKatIp0CFWQhQFZX2gd3SBE"
ALGORITHM = "HS256"

# Create token
payload = {"user_id": "123", "exp": datetime.utcnow() + timedelta(minutes=15)}
token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
print("Token created:", token[:50] + "...")

# Verify token
decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
print("Token valid! User ID:", decoded["user_id"])
```

---

## 🌍 Environment-Specific Keys

### Development (.env):
```env
SECRET_KEY=NATGo4Q9h3wkPqr5K4iiUKatIp0CFWQhQFZX2gd3SBE
DEBUG=True
```

### Production (.env.production):
```env
SECRET_KEY=<different_production_key_here>
DEBUG=False
```

**Important**: Generate a NEW key for production!

---

## ✅ Current Status

### Your Configuration:
- ✅ SECRET_KEY: **Generated and configured**
- ✅ Length: **43 characters** (secure)
- ✅ Algorithm: **HS256** (standard)
- ✅ Location: **.env file** (secure)
- ✅ Token expiry: **15 minutes** (reasonable)
- ✅ Refresh token: **7 days** (good)

### Application Status:
- ✅ **Ready to run** - No blockers
- ✅ **Secure** - Proper key configured
- ✅ **JWT working** - Token generation/validation ready

---

## 🚀 Next Steps

1. **Restart Backend** (to load new SECRET_KEY):
   ```bash
   # Press Ctrl+C in backend terminal
   start-backend.bat
   ```

2. **Test Authentication**:
   - Login via frontend
   - Verify JWT token in localStorage
   - Test authenticated API calls

3. **For Production**:
   - Generate NEW SECRET_KEY
   - Store in secure vault
   - Never commit to git

---

## 🔐 Security Checklist

- [x] SECRET_KEY generated securely
- [x] SECRET_KEY stored in .env
- [x] .env in .gitignore
- [x] Key length > 32 characters
- [x] Using HS256 algorithm
- [ ] Different key for production (when deploying)
- [ ] Key rotation schedule set (every 90 days)
- [ ] Backup/recovery plan documented

---

**Your application is now secure and ready to run!** ✅

The SECRET_KEY is properly configured and will not block your application.

**Remember**:
- This key is for **development only**
- Generate a **new key for production**
- **Never commit** .env to git (already in .gitignore)
