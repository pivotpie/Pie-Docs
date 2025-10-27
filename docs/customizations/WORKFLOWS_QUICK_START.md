# 🚀 Workflows Quick Start Guide

Get up and running with Pie-Docs Workflows in 5 minutes!

---

## ⚡ Quick Setup

### 1. Check Prerequisites

Ensure you have:
- ✅ PostgreSQL running on port 5434
- ✅ Python 3.10+ installed
- ✅ Node.js 18+ installed
- ✅ Database initialized with migrations

### 2. Start Backend

```bash
cd pie-docs-backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Verify:** Open http://localhost:8001/health

### 3. Start Frontend

```bash
cd pie-docs-frontend
npm run dev
```

**Verify:** Open http://localhost:3001

---

## 🎯 Access the System

### Login Credentials
- **Username:** `admin`
- **Password:** `password123`

### Navigate to Workflows
1. Login at http://localhost:3001
2. Click **"Workflows"** in the navigation menu

---

## 🎨 Create Your First Workflow

### Using the UI (Recommended)

1. Go to **Designer** tab
2. Click **"New Workflow"**
3. Drag elements from the palette
4. Connect elements
5. Configure each element
6. Click **"Save Workflow"**
7. Set status to **"Active"**
8. Go to **Overview** tab
9. Click **"Run"** on your workflow

---

## 📊 Pre-built Templates

Go to **"Templates"** tab to use pre-built workflows:
- Document Approval Workflow
- Review Process
- Notification Chains

---

## 🧪 Monitor Execution

1. Go to **Testing & Validation** tab
2. Select workflow from dropdown
3. View real-time execution status

---

## 🎉 Success!

You now have a fully functional workflow system!

For more details, see:
- [Complete Implementation Guide](./WORKFLOWS_COMPLETE_IMPLEMENTATION_GUIDE.md)
- [API Reference](./WORKFLOWS_API_REFERENCE.md)
- [API Documentation](http://localhost:8001/docs)

**Last Updated:** October 6, 2025
