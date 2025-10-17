# Keycloak Service Account Setup Guide

## 🎯 **Current Status**

- ✅ User created: `subtitles-admin@kab.info`
- ✅ Client exists: `kolman-dev`
- ❌ Access Type: `public` (needs to be `confidential`)
- ❌ Service Account: Not enabled
- ❌ Realm-management roles: Not assigned

## 🔧 **Step-by-Step Setup**

### **Step 1: Configure Client for Service Account**

1. **Go to Clients** → **`kolman-dev`**
2. **Change Access Type**:

   - Find **"Access Type"** field
   - Change from `public` to `confidential`
   - Click **"Save"**

3. **Enable Service Account**:
   - After saving, you should now see **"Service Accounts Enabled"** toggle
   - Turn **ON**: "Service Accounts Enabled"
   - Turn **ON**: "Authorization Enabled" (if available)
   - Click **"Save"**

### **Step 2: Get Client Secret**

1. **Go to "Credentials" tab** in `kolman-dev` client
2. **Copy the "Secret"** value
3. **Add to `.env_dev`**:
   ```bash
   BSSVR_KEYCLOAK_CLIENT_SECRET=your-copied-secret-here
   ```

### **Step 3: Assign Realm-Management Roles**

1. **Go to Clients** → **`realm-management`** (system client)
2. **Go to "Service Account Roles" tab**
3. **Find and assign these roles**:
   - `manage-users`
   - `manage-clients`
   - `view-users`
   - `query-users`

### **Step 4: Test the Integration**

1. **Restart backend server**:

   ```bash
   cd backend
   go run cmd/bssvr/main.go
   ```

2. **Test user creation** in the admin interface
3. **Check Keycloak** - new users should appear in the Users list

## 🚨 **Troubleshooting**

### **If you can't find `realm-management` client:**

- It's a system client, should be visible in the Clients list
- If not visible, check if you have admin permissions

### **If "Service Accounts Enabled" doesn't appear:**

- Make sure Access Type is set to `confidential`
- Save the client settings first
- Refresh the page

### **If roles are not available:**

- Make sure you're in the `realm-management` client
- Look in "Service Account Roles" tab, not "Roles" tab
- These are system roles, not custom roles

## 📝 **Environment Variables**

Add to `backend/.env_dev`:

```bash
BSSVR_KEYCLOAK_CLIENT_SECRET=your-actual-secret-here
```

## ✅ **Success Indicators**

- ✅ Client Access Type: `confidential`
- ✅ Service Accounts Enabled: `ON`
- ✅ Client Secret: Copied and added to `.env_dev`
- ✅ Realm-management roles: Assigned to service account
- ✅ Backend starts without errors
- ✅ User creation works and appears in Keycloak

## 🔄 **Next Steps**

1. Complete the setup above
2. Restart backend server
3. Test user creation in admin interface
4. Verify users appear in Keycloak Admin Console

