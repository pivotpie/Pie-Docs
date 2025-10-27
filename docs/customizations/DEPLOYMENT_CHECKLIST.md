# Pie-Docs Deployment Checklist

## ✅ Pre-Deployment Verification

### Database Setup
- [x] PostgreSQL installed and running
- [x] Database `piedocs` created
- [x] User `piedocs` created with password
- [x] Database migrations executed
- [x] `user_preferences` table created
- [x] `system_settings` table populated
- [x] All 75 tables present and verified

### Backend Configuration
- [x] Python 3.10+ installed
- [x] Virtual environment created
- [x] Dependencies installed (`requirements.txt`)
- [x] `.env` file configured with:
  - [x] `DATABASE_URL` pointing to PostgreSQL
  - [x] `CORS_ORIGINS` including frontend URLs
  - [x] `SECRET_KEY` set (change in production!)
  - [x] `API_PORT=8001`
- [x] Backend starts without errors
- [x] Health check responds: `http://localhost:8001/health`

### Frontend Configuration
- [x] Node.js 18+ installed
- [x] Dependencies installed (`npm install`)
- [x] `.env` file configured with:
  - [x] `VITE_API_BASE_URL=http://localhost:8001/api/v1`
  - [x] `VITE_API_URL=http://localhost:8001`
  - [x] `VITE_RAG_API_URL=http://localhost:8001/api/v1`
  - [x] `VITE_USE_MOCK_DATA=false`
- [x] Frontend builds without errors

### CORS Configuration
- [x] Backend CORS origins include frontend URL
- [x] CORS middleware configured in `main.py`
- [x] `allow_credentials=True` set
- [x] `allow_methods=["*"]` set
- [x] `allow_headers=["*"]` set

---

## 🧪 Testing Checklist

### Backend API Tests
- [x] Health endpoint: `GET /health`
- [x] Status endpoint: `GET /api/v1/status`
- [ ] Settings API: `GET /api/v1/settings` (requires auth)
- [ ] User preferences: `GET /api/v1/user-preferences` (requires auth)
- [x] API documentation accessible: `http://localhost:8001/docs`

### Frontend Tests
- [ ] Application loads: `http://localhost:5173`
- [ ] Login page accessible
- [ ] Settings page accessible: `http://localhost:5173/settings`
- [ ] No console errors
- [ ] No CORS errors

### Settings Section Tests

#### User Settings
- [ ] Profile page loads
- [ ] Can edit profile fields
- [ ] Avatar upload works
- [ ] Avatar delete works
- [ ] Preferences page loads
- [ ] Can change language
- [ ] Can change theme
- [ ] Can change timezone
- [ ] Can toggle notifications
- [ ] Security page loads
- [ ] Can change password
- [ ] Can enable 2FA
- [ ] Can view sessions
- [ ] Can revoke sessions

#### Admin Settings (if admin)
- [ ] User management page loads
- [ ] Can create user
- [ ] Can edit user
- [ ] Can assign roles
- [ ] Can activate/deactivate user
- [ ] Can delete user
- [ ] Role management accessible
- [ ] Permission management accessible
- [ ] System settings accessible
- [ ] Can update system settings

### Integration Tests
- [ ] Login flow works end-to-end
- [ ] Token stored in localStorage
- [ ] Authenticated requests include token
- [ ] Logout works
- [ ] Session timeout works
- [ ] Refresh token works

---

## 🚀 Deployment Steps

### 1. Local Development

```bash
# Start backend
./start-backend.bat  # Windows
./start-backend.sh   # Linux/Mac

# Start frontend (in new terminal)
./start-frontend.bat # Windows
./start-frontend.sh  # Linux/Mac

# Or start both at once
./start-all.bat      # Windows
./start-all.sh       # Linux/Mac
```

### 2. Production Deployment

#### Backend (Production)

1. **Update .env for production**:
```env
DATABASE_URL=postgresql://user:password@production-db:5432/piedocs
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
SECRET_KEY=<generate-strong-32+-char-key>
API_HOST=0.0.0.0
API_PORT=8001
DEBUG=False
```

2. **Use production WSGI server**:
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
```

3. **Set up systemd service** (Linux):
```ini
[Unit]
Description=Pie-Docs API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/pie-docs-backend
Environment="PATH=/var/www/pie-docs-backend/venv/bin"
ExecStart=/var/www/pie-docs-backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001

[Install]
WantedBy=multi-user.target
```

#### Frontend (Production)

1. **Update .env.production**:
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_API_URL=https://api.yourdomain.com
VITE_RAG_API_URL=https://api.yourdomain.com/api/v1
VITE_USE_MOCK_DATA=false
```

2. **Build for production**:
```bash
npm run build
```

3. **Serve with nginx**:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/pie-docs-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔒 Security Checklist

### Before Production
- [ ] Change `SECRET_KEY` to strong random value
- [ ] Set `DEBUG=False`
- [ ] Use HTTPS for all URLs
- [ ] Configure firewall (only open necessary ports)
- [ ] Set up SSL/TLS certificates
- [ ] Enable rate limiting
- [ ] Configure database backups
- [ ] Set up monitoring/logging
- [ ] Review CORS origins (no wildcards)
- [ ] Enable security headers (HSTS, CSP, etc.)
- [ ] Set strong database password
- [ ] Disable unnecessary endpoints
- [ ] Set up API key rotation policy
- [ ] Configure session timeout
- [ ] Enable audit logging
- [ ] Set up intrusion detection

---

## 📊 Monitoring Checklist

### Health Checks
- [ ] `/health` endpoint monitored
- [ ] Database connection monitored
- [ ] CPU/Memory usage tracked
- [ ] Disk space monitored
- [ ] API response times tracked

### Logging
- [ ] Application logs centralized
- [ ] Error logs monitored
- [ ] Audit logs stored securely
- [ ] Log rotation configured
- [ ] Alerts set up for critical errors

### Metrics
- [ ] User login/logout tracked
- [ ] API request volume tracked
- [ ] Failed authentication attempts monitored
- [ ] 2FA usage tracked
- [ ] Settings changes logged

---

## 🔄 Maintenance Checklist

### Daily
- [ ] Check error logs
- [ ] Monitor system health
- [ ] Review security alerts

### Weekly
- [ ] Review audit logs
- [ ] Check disk space
- [ ] Review API usage patterns
- [ ] Update dependencies (if needed)

### Monthly
- [ ] Database maintenance
- [ ] Review and rotate API keys
- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification

---

## 📝 Post-Deployment Verification

### Smoke Tests
- [ ] Application accessible via public URL
- [ ] Login works
- [ ] Settings page loads
- [ ] API calls successful
- [ ] No errors in logs
- [ ] SSL certificate valid
- [ ] CORS working correctly

### Load Tests
- [ ] 100 concurrent users supported
- [ ] Response times < 500ms
- [ ] No memory leaks
- [ ] Database connections pooled correctly

### Disaster Recovery
- [ ] Backup restoration tested
- [ ] Rollback procedure documented
- [ ] Database backup automated
- [ ] Configuration backed up

---

## 🎯 Success Criteria

### Functional
- ✅ All features working as designed
- ✅ No critical bugs
- ✅ Performance meets requirements
- ✅ Security measures in place

### Technical
- ✅ Code deployed successfully
- ✅ Database migrations completed
- ✅ All services running
- ✅ Monitoring active

### User Experience
- ✅ Application responsive
- ✅ No errors visible to users
- ✅ Settings save correctly
- ✅ Intuitive navigation

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: CORS errors
**Solution**: Check backend CORS_ORIGINS includes frontend URL

**Issue**: 401 Unauthorized
**Solution**: Verify auth token is being sent

**Issue**: Database connection failed
**Solution**: Check DATABASE_URL and database is running

**Issue**: Settings not saving
**Solution**: Check backend logs, verify API endpoints

**Issue**: Frontend won't start
**Solution**: Check .env file, run `npm install`

---

## 📚 Documentation

- [x] SETTINGS_IMPLEMENTATION_COMPLETE.md created
- [x] SETTINGS_QUICK_START.md created
- [x] CORS_AND_API_CONFIGURATION.md created
- [x] DEPLOYMENT_CHECKLIST.md created
- [x] Startup scripts created (.bat and .sh)
- [ ] API documentation reviewed
- [ ] User guide created (optional)

---

**Deployment Status**: Ready for Testing
**Last Updated**: October 6, 2025
**Version**: 1.0.0
