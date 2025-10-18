# Environment Setup Guide

## 🔒 Security Notice

**NEVER commit `.env` files to the repository!** They contain sensitive information like passwords and API keys.

## 📋 Setup Instructions

### Backend Setup

1. **Copy the template:**

   ```bash
   cp backend/.env.template backend/.env
   cp backend/.env.dev.template backend/.env_dev
   ```

2. **Fill in your values:**
   - Replace `YOUR_DATABASE_PASSWORD` with your actual database password
   - Replace `YOUR_SERVICE_CLIENT_ID` with your Keycloak service client ID
   - Replace `YOUR_SERVICE_CLIENT_SECRET` with your Keycloak service client secret
   - Replace `YOUR_APP_CLIENT_ID` with your Keycloak application client ID

### Frontend Setup

1. **Copy the template:**

   ```bash
   cp frontend/.env.template frontend/.env
   cp frontend/.env.template frontend/.env.development
   ```

2. **Fill in your values:**
   - Replace `YOUR_CLIENT_ID` with your Keycloak client ID

## 🚀 Quick Start

After setting up your `.env` files:

```bash
# Backend
cd backend
go run ./cmd/bssvr/main.go

# Frontend
cd frontend
npm start
```

## 🔧 Current Configuration

- **Backend Port**: 8080
- **Frontend Port**: 3000
- **Keycloak URL**: https://auth.2serv.eu/auth
- **Realm**: master

## ⚠️ Important Notes

- `.env` files are ignored by git (see `.gitignore`)
- Always use `.env.template` files as a reference
- Never share your actual `.env` files
- Update templates when adding new environment variables
