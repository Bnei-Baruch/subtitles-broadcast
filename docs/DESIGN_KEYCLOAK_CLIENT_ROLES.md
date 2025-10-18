# Design Document: Migrate to Keycloak Client Roles

## ✅ COMPLETED - Implementation Status

**Status**: ✅ **COMPLETED** - The migration to Keycloak client roles has been successfully implemented.

## Problem Statement (Resolved)

The Subtitles Broadcast application was using Keycloak **Realm roles** for authorization. This approach was not recommended because:

- Realm roles are global across all clients in the realm
- Client roles provide better isolation and are the recommended practice
- Client roles are easier to manage per application

## ✅ Solution Implemented

Successfully migrated the application to use **Client roles** with realm role fallback. The system now:
- ✅ Uses client roles as primary authorization method
- ✅ Falls back to realm roles when client roles are not available
- ✅ Includes comprehensive admin interface for user and role management
- ✅ Uses standard Keycloak realm-management roles for service account

## Current Configuration

### Production

- **Keycloak URL**: `https://accounts.kab.info/auth`
- **Realm**: `main`
- **Client ID**: `subtitles`

### Development

- **Keycloak URL**: `https://auth.2serv.eu/auth`
- **Realm**: `master`
- **Client ID**: `kolman-dev`

## Current Roles

- `admin` - Full access to all features
- `operator` - Access to Subtitles, Archive, Source, New pages
- `translator` - Access to Question page

**Role naming pattern**: `subtitles_*` (e.g., `subtitles_operator`, `subtitles_translator`) or `admin`

## Changes Required

### 1. Frontend Changes

**File**: `frontend/src/Utils/Auth.js` (function `determineAccess`, lines 115-140)

**Current code** reads from:

```javascript
keycloak.realmAccess.roles;
```

**New code** should read from:

```javascript
keycloak.resourceAccess[clientId].roles;
```

**Implementation**:

- Update the `determineAccess()` function to check `keycloak.resourceAccess[clientId]` instead of `keycloak.realmAccess`
- Handle cases where `resourceAccess` or the client doesn't exist (graceful fallback)
- Keep the same role naming pattern and extraction logic
- During migration: check both `resourceAccess` and `realmAccess` for backward compatibility

### 2. Backend Changes

**File**: `backend/pkg/auth/auth.go`

**Current state**: Role extraction is commented out (lines 16-43)

**Required changes**:

1. Uncomment and update the `ResourceAccess` structure:

   ```go
   type ResourceAccess struct {
       Roles []string `json:"roles"`
   }

   type IDTokenClaims struct {
       // ... existing fields
       ResourceAccess map[string]ResourceAccess `json:"resource_access"`
   }
   ```

2. Add helper methods:
   ```go
   func (c *IDTokenClaims) GetClientRoles(clientId string) []string
   func (c *IDTokenClaims) HasRole(clientId, role string) bool
   ```

**File**: `backend/internal/api/middleware.go`

- Update `UserRoleHandler()` to extract client roles from JWT token
- Store roles in request context: `ctx.Set("user_roles", roles)`
- Use roles for authorization where needed

**File**: `backend/internal/config/config.go`

- Add new constant: `EnvBssvrKeycloakClientId = "BSSVR_KEYCLOAK_CLIENT_ID"`
- Backend will need the client ID to extract the correct roles from `resource_access`

### ✅ 3. Environment Variables (Implemented)

**Backend** (implemented):

```bash
# Service Account Client (for backend authentication)
BSSVR_KEYCLOAK_CLIENT_ID=kolman-dev-service  # service account client
BSSVR_KEYCLOAK_CLIENT_SECRET=YOUR_SERVICE_CLIENT_SECRET

# Application Client (where roles are defined)
BSSVR_KEYCLOAK_APP_CLIENT_ID=kolman-dev  # application client
```

**Frontend** (implemented):

```bash
REACT_APP_KEYCLOAK_CLIENT_ID=kolman-dev  # public client for frontend
```

## ✅ Migration Steps (Completed)

### ✅ Phase 1: Code Changes (Completed)

1. ✅ Updated frontend `Auth.js` to check both `resourceAccess` and `realmAccess`
2. ✅ Updated backend `auth.go` to extract and expose client roles
3. ✅ Added backend environment variables for client IDs
4. ✅ Tested in development environment

### ✅ Phase 2: Keycloak Configuration (Completed)

1. ✅ Created client roles in Keycloak client:
   - `subtitles_admin`
   - `subtitles_operator`
   - `subtitles_translator`
2. ✅ Assigned client roles to users (migrated from realm roles)
3. ✅ Verified all users have correct access

### ✅ Phase 3: Admin Interface (Completed)

1. ✅ Implemented comprehensive admin interface for user management
2. ✅ Added role assignment and removal functionality
3. ✅ Implemented pagination and search
4. ✅ Added password management with temporary flag support

## ✅ Testing Checklist (Completed)

- ✅ Users with `operator` role can access operator pages
- ✅ Users with `translator` role can access translator pages
- ✅ Users with `admin` role can access all pages
- ✅ Users without roles cannot access the application
- ✅ Token refresh works correctly with client roles
- ✅ Role checks work in both frontend and backend
- ✅ Admin interface allows user creation, editing, and deletion
- ✅ Admin interface allows role assignment and removal
- ✅ Password management with temporary flag works correctly
- ✅ Pagination and search functionality works

## Rollback Plan

If issues occur:

1. The code supports both realm and client roles during Phase 1
2. Can revert deployment and investigate
3. Keycloak realm roles remain intact until Phase 3

## Keycloak Administration

**Note**: Role assignments are managed through the comprehensive admin interface in the application, as well as directly in the Keycloak admin console.

### Service Account Configuration

The backend service account uses **standard Keycloak realm-management roles**:
- `manage-users` - Permission to manage users
- `manage-clients` - Permission to manage clients
- `view-users` - Permission to view users
- `query-clients` - Permission to query clients

**No custom realm roles are needed** - the standard Keycloak functionality works perfectly.

### Role Management

To assign roles (for Keycloak administrators):

1. Go to Keycloak Admin Console
2. Select Realm → Clients → `kolman-dev` (application client)
3. Go to Roles tab → select role
4. Go to Users tab → assign role to users

**Or use the Admin Interface** in the application for easier management.

## Timeline

- **Code changes & testing**: 2-3 days
- **Keycloak configuration**: Coordinated with Keycloak admin
- **Deployment & monitoring**: 1 day

## ✅ Success Criteria (Achieved)

- ✅ Application successfully authenticates users with client roles
- ✅ All role-based access controls work correctly
- ✅ No disruption to existing users during migration
- ✅ Code is cleaner and follows Keycloak best practices
- ✅ Comprehensive admin interface implemented
- ✅ Service account uses standard Keycloak realm-management roles
- ✅ Client role management with realm role fallback works perfectly
