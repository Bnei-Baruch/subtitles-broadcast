# Design Document: Migrate to Keycloak Client Roles

## Problem Statement

Currently, the Subtitles Broadcast application uses Keycloak **Realm roles** for authorization. This approach is not recommended because:

- Realm roles are global across all clients in the realm
- Client roles provide better isolation and are the recommended practice
- Client roles are easier to manage per application

## Proposed Solution

Migrate the application to use **Client roles** instead of Realm roles. Role management will continue to be done directly in Keycloak (no changes to Keycloak management workflow).

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

### 3. Environment Variables

**Backend** (new variable needed):

```bash
BSSVR_KEYCLOAK_CLIENT_ID=subtitles  # production
# or
BSSVR_KEYCLOAK_CLIENT_ID=kolman-dev  # development
```

**Frontend** (already exists):

```bash
REACT_APP_KEYCLOAK_CLIENT_ID=subtitles  # production
REACT_APP_KEYCLOAK_CLIENT_ID=kolman-dev  # development
```

## Migration Steps

### Phase 1: Code Changes (Backward Compatible)

1. Update frontend `Auth.js` to check both `resourceAccess` and `realmAccess`
2. Update backend `auth.go` to extract and expose client roles
3. Add backend environment variable for client ID
4. Test in development environment

### Phase 2: Keycloak Configuration

1. Create client roles in Keycloak client (done by Keycloak admin):
   - `subtitles_operator`
   - `subtitles_translator`
   - `admin`
2. Assign client roles to users (migrate from realm roles)
3. Verify all users have correct access

### Phase 3: Remove Realm Role Support

1. Remove backward compatibility code (realm role checking)
2. Deploy to production
3. Monitor for issues

## Testing Checklist

- [ ] Users with `operator` role can access operator pages
- [ ] Users with `translator` role can access translator pages
- [ ] Users with `admin` role can access all pages
- [ ] Users without roles cannot access the application
- [ ] Token refresh works correctly with client roles
- [ ] Role checks work in both frontend and backend

## Rollback Plan

If issues occur:

1. The code supports both realm and client roles during Phase 1
2. Can revert deployment and investigate
3. Keycloak realm roles remain intact until Phase 3

## Keycloak Administration

**Note**: Role assignments will continue to be managed in the Keycloak admin console. This migration only changes how the application reads roles from the JWT token - no changes to the Keycloak management workflow.

To assign roles (for Keycloak administrators):

1. Go to Keycloak Admin Console
2. Select Realm → Clients → `subtitles` (or `kolman-dev`)
3. Go to Roles tab → select role
4. Go to Users tab → assign role to users

## Timeline

- **Code changes & testing**: 2-3 days
- **Keycloak configuration**: Coordinated with Keycloak admin
- **Deployment & monitoring**: 1 day

## Success Criteria

- Application successfully authenticates users with client roles
- All role-based access controls work correctly
- No disruption to existing users during migration
- Code is cleaner and follows Keycloak best practices
