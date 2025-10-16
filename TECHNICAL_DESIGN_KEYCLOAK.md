# Design Document: Keycloak Client Roles Migration & Admin Role Management

## Overview

Migrate the Subtitles Broadcast application from using Keycloak **Realm roles** to **Client roles**, and implement an admin interface for managing user roles.

---

## Current State Analysis

### Frontend

- **Location**: `frontend/src/Utils/Auth.js` (lines 115-140)
- **Current Implementation**:
  - Reads roles from `keycloak.realmAccess.roles`
  - Filters for roles matching pattern: `subtitles_*` or `admin`
  - Extracts security roles: `operator`, `translator`, `admin`
  - Stores in auth context and Redux state

### Backend

- **Location**: `backend/pkg/auth/auth.go`
- **Current Implementation**:
  - Token verification via OIDC provider
  - **No role extraction** from JWT tokens (commented out for future use)
  - Middleware validates JWT but doesn't enforce role-based access

### Existing Roles

- `admin` - Full access + role management capabilities
- `operator` - Access to Subtitles, Archive, Source, New pages
- `translator` - Access to Question page

---

## Design Requirements

### 1. Keycloak Client Roles Migration

#### Frontend Changes

**File**: `frontend/src/Utils/Auth.js`

```javascript
// Change from:
keycloak.realmAccess.roles;

// To:
keycloak.resourceAccess[clientId].roles;
```

**Implementation**:

- Update `determineAccess()` function to read from `keycloak.resourceAccess[clientId]`
- Maintain same role naming convention: `subtitles_operator`, `subtitles_translator`, `admin`
- Handle cases where `resourceAccess` or client doesn't exist
- Keep backward compatibility during migration (check both realm and client roles temporarily)

#### Backend Changes

**File**: `backend/pkg/auth/auth.go`

```go
// Uncomment and implement ResourceAccess structure
type ResourceAccess struct {
    Roles []string `json:"roles"`
}

type IDTokenClaims struct {
    // ... existing fields
    ResourceAccess map[string]ResourceAccess `json:"resource_access"`
}
```

**New Functions**:

- `(c *IDTokenClaims) GetClientRoles(clientId string) []string`
- `(c *IDTokenClaims) HasRole(clientId, role string) bool`

**File**: `backend/internal/api/middleware.go`

- Update `UserRoleHandler()` to extract and validate client roles
- Store user roles in context: `ctx.Set("user_roles", roles)`
- Add role-based middleware: `RequireRole(role string) gin.HandlerFunc`

#### Configuration Changes

**Files**:

- `backend/internal/config/config.go` - Add `EnvBssvrKeycloakClientId`
- Environment variables - Add `BSSVR_KEYCLOAK_CLIENT_ID`

---

### 2. Admin Role Management Interface

#### Frontend Components

**New Page**: `frontend/src/Pages/AdminRoleManagement.jsx`

- **Location**: New file in Pages directory
- **Route**: `/admin/roles` (protected, admin-only)
- **Features**:
  - User search/list view
  - Display current user roles
  - Assign/remove roles to users
  - Role management actions

**Component Structure**:

```
AdminRoleManagement
├── UserSearchBar (search users by email/username)
├── UserList (table/list of users)
│   └── UserRoleCard (for each user)
│       ├── User info display
│       ├── Current roles badges
│       └── Role action buttons
└── RoleAssignmentModal
    ├── Available roles dropdown
    └── Assign/Remove buttons
```

**New Route**: Update `frontend/src/Routes/Routes.jsx`

```javascript
{
  isAdmin(securityRoles) && (
    <Route path="/admin/roles" element={<AdminRoleManagement />} />
  );
}
```

**Navigation**: Update `frontend/src/Layout/SideNavBar.jsx`

- Add "Admin" menu item for admin users
- Icon: settings or shield icon
- Link to `/admin/roles`

#### Backend API Endpoints

**New File**: `backend/internal/api/admin.go`

**Endpoints**:

```
GET    /api/v1/admin/users                    - List all users
GET    /api/v1/admin/users/:user_id/roles     - Get user's roles
POST   /api/v1/admin/users/:user_id/roles     - Assign role to user
DELETE /api/v1/admin/users/:user_id/roles/:role - Remove role from user
GET    /api/v1/admin/roles                    - List available client roles
```

**Authentication/Authorization**:

- All endpoints require `admin` role
- Use middleware: `RequireRole("admin")`

**Keycloak Admin Client Integration**:

- **Package**: `github.com/Nerzal/gocloak/v13`
- Initialize Keycloak admin client with service account credentials
- Implement role management operations:
  - `GetRealmUsers()`
  - `GetClientRoles(clientId)`
  - `GetUserClientRoles(userId, clientId)`
  - `AddClientRoleToUser(userId, clientId, roles)`
  - `DeleteClientRoleFromUser(userId, clientId, roles)`

**New Configuration**:

```go
// backend/internal/config/config.go
EnvBssvrKeycloakAdminUser     = "BSSVR_KEYCLOAK_ADMIN_USER"
EnvBssvrKeycloakAdminPassword = "BSSVR_KEYCLOAK_ADMIN_PASSWORD"
EnvBssvrKeycloakRealm         = "BSSVR_KEYCLOAK_REALM"
EnvBssvrKeycloakClientId      = "BSSVR_KEYCLOAK_CLIENT_ID"
```

**Router Update**: `backend/internal/api/router.go`

```go
admin := v1.Group("/admin")
admin.Use(RequireRole("admin"))
{
    admin.GET("/users", handler.ListUsers)
    admin.GET("/users/:user_id/roles", handler.GetUserRoles)
    admin.POST("/users/:user_id/roles", handler.AssignUserRole)
    admin.DELETE("/users/:user_id/roles/:role", handler.RemoveUserRole)
    admin.GET("/roles", handler.ListAvailableRoles)
}
```

---

## Data Models

### Frontend Types

```typescript
// New types for admin functionality
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
}

interface UserRole {
  id: string;
  name: string;
  description?: string;
}

interface UserWithRoles extends User {
  roles: UserRole[];
}
```

### Backend Models

```go
// backend/internal/api/models.go
type UserInfo struct {
    ID        string   `json:"id"`
    Username  string   `json:"username"`
    Email     string   `json:"email"`
    FirstName string   `json:"firstName"`
    LastName  string   `json:"lastName"`
    Enabled   bool     `json:"enabled"`
    Roles     []string `json:"roles,omitempty"`
}

type RoleAssignmentRequest struct {
    RoleName string `json:"role_name" binding:"required"`
}

type AvailableRole struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description,omitempty"`
}
```

---

## Migration Strategy

### Phase 1: Backend Preparation (No Breaking Changes)

1. Add client role extraction to `auth.go`
2. Update middleware to support both realm and client roles
3. Add Keycloak admin client integration
4. Implement admin API endpoints
5. Add new environment variables

### Phase 2: Frontend Client Roles (Feature Flag)

1. Update `Auth.js` to check both realm and client roles
2. Add feature flag: `REACT_APP_USE_CLIENT_ROLES`
3. Test with client roles enabled

### Phase 3: Admin UI

1. Create admin page components
2. Add routing and navigation
3. Implement role management UI
4. Add proper error handling and feedback

### Phase 4: Keycloak Configuration

1. Create client roles in Keycloak:
   - `subtitles_operator`
   - `subtitles_translator`
   - `admin`
2. Create service account for admin API access
3. Migrate existing realm role assignments to client roles

### Phase 5: Cutover

1. Remove realm role checking code
2. Remove feature flag
3. Update documentation
4. Deploy to production

---

## Security Considerations

1. **Admin API Protection**:

   - All admin endpoints require `admin` role
   - Validate user IDs and role names server-side
   - Log all role assignment/removal actions

2. **Service Account**:

   - Use dedicated Keycloak service account
   - Minimum required permissions: `manage-users`, `manage-clients`
   - Store credentials securely (environment variables, secrets manager)

3. **Input Validation**:

   - Validate role names against allowed list
   - Prevent role escalation (can't assign roles you don't have)
   - Sanitize all user inputs

4. **Audit Trail**:
   - Log all role changes with timestamp, admin user, target user
   - Consider adding audit table in database

---

## Testing Strategy

### Unit Tests

- Frontend: Test role checking logic
- Backend: Test JWT claims extraction, role validation

### Integration Tests

- Test Keycloak admin client operations
- Test API endpoints with different role combinations

### Manual Testing Checklist

- [ ] Users with `operator` role can access operator pages
- [ ] Users with `translator` role can access translator pages
- [ ] Users with `admin` role can access admin panel
- [ ] Admin can list all users
- [ ] Admin can assign roles to users
- [ ] Admin can remove roles from users
- [ ] Non-admin users cannot access admin endpoints
- [ ] Role changes reflect immediately (after token refresh)

---

## Dependencies

### New Backend Dependencies

```go
// go.mod
github.com/Nerzal/gocloak/v13 v13.x.x
```

### New Frontend Dependencies

```json
// package.json (if needed for admin UI)
"@mui/icons-material": "^5.x.x" (already in project)
```

---

## Environment Variables

### Backend

```bash
# Existing
BSSVR_KEYCLOAK_URI=https://auth.kab.info/auth/

# New
BSSVR_KEYCLOAK_REALM=main
BSSVR_KEYCLOAK_CLIENT_ID=subtitles-app
BSSVR_KEYCLOAK_ADMIN_USER=admin-service-account
BSSVR_KEYCLOAK_ADMIN_PASSWORD=<secure-password>
```

### Frontend

```bash
# Existing
REACT_APP_KEYCLOAK_REALM=main
REACT_APP_KEYCLOAK_CLIENT_ID=membership_pay
REACT_APP_KEYCLOAK_URL=https://accounts.kab.info/auth/

# Optional (for migration)
REACT_APP_USE_CLIENT_ROLES=true
```

---

## Timeline Estimate

| Phase                    | Estimated Time | Description                                     |
| ------------------------ | -------------- | ----------------------------------------------- |
| 1. Backend Preparation   | 2-3 days       | Auth changes, admin client setup, API endpoints |
| 2. Frontend Client Roles | 1 day          | Update role checking logic                      |
| 3. Admin UI              | 3-4 days       | Build admin interface components                |
| 4. Keycloak Config       | 1 day          | Setup roles, service account, migrate data      |
| 5. Testing & Refinement  | 2-3 days       | Integration testing, bug fixes                  |
| **Total**                | **9-12 days**  | Full implementation                             |

---

## Open Questions

1. Should role changes require user re-login or work after token refresh?
2. Should we maintain an audit log in the database or rely on Keycloak logs?
3. Do we need pagination for user list (for large user bases)?
4. Should admins be able to create/delete roles or just assign existing ones?
5. Do we need role groups/templates for common role combinations?

---

## Success Criteria

- [ ] Application uses client roles instead of realm roles
- [ ] Admin users can manage user roles via web interface
- [ ] No disruption to existing user access during migration
- [ ] All role checks function correctly in both frontend and backend
- [ ] Admin actions are properly logged and auditable
- [ ] Documentation updated with new role management process
