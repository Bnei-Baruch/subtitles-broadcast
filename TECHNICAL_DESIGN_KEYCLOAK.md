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

---

## Keycloak Setup Instructions for Amnon (amnonbb@gmail.com)

### Overview

This section provides step-by-step instructions for setting up Keycloak client roles and enabling admin functionality for the Subtitles Broadcast application.

### Current Environment Status

- **Development**: `kolman-dev` client already exists in `master` realm
- **Production**: `subtitles` client exists in `main` realm
- **Current Issue**: Application reads from `realm_access` instead of `resource_access`

### Step 1: Create Client Roles

#### For Development Environment (`kolman-dev` client)

1. **Access Keycloak Admin Console**

   - URL: `https://auth.2serv.eu/auth/admin/master/console/`
   - Login with admin credentials

2. **Navigate to Client Roles**

   - Go to: `Configure` → `Clients` → `kolman-dev` → `Roles` tab
   - You should see existing role: `kolman-dev-users`

3. **Create Required Client Roles**
   Click "Add Role" and create these roles:

   ```
   Role Name: subtitles_admin
   Description: Full access to subtitles application + role management

   Role Name: subtitles_operator
   Description: Access to Subtitles, Archive, Source, New pages

   Role Name: subtitles_translator
   Description: Access to Question page
   ```

4. **Verify Role Creation**
   - All three roles should appear in the roles table
   - Each role should have `Composite: False`

#### For Production Environment (`subtitles` client)

1. **Access Production Keycloak**

   - URL: `https://accounts.kab.info/auth/admin/main/console/`
   - Login with production admin credentials

2. **Navigate to Client Roles**

   - Go to: `Configure` → `Clients` → `subtitles` → `Roles` tab

3. **Create Same Client Roles**
   ```
   Role Name: subtitles_admin
   Role Name: subtitles_operator
   Role Name: subtitles_translator
   ```

### Step 2: Assign Client Roles to Users

#### Development Environment

1. **Navigate to Users**

   - Go to: `Manage` → `Users`

2. **Find Target User**

   - Search for user (e.g., `slavapas13@gmail.com`)
   - Click on the user

3. **Assign Client Roles**

   - Go to `Role Mappings` tab
   - Click `Assign role` button
   - Select `Filter by clients` dropdown
   - Choose `kolman-dev`
   - Select appropriate roles:
     - For admin users: `subtitles_admin`
     - For operators: `subtitles_operator`
     - For translators: `subtitles_translator`

4. **Verify Assignment**
   - Roles should appear in "Assigned Roles" section
   - Check that roles are under `kolman-dev` client, not realm

#### Production Environment

1. **Repeat same process** for production users in `main` realm
2. **Assign roles** from `subtitles` client

### Step 3: Enable Admin API Access (For Future Admin UI)

#### Create Service Account for Admin Operations

1. **Create Service Account User**

   - Go to: `Manage` → `Users` → `Add user`
   - Username: `subtitles-admin-service`
   - Email: `subtitles-admin@kab.info`
   - First name: `Subtitles`
   - Last name: `Admin Service`
   - Enable: `ON`
   - Click `Create`

2. **Set Service Account Credentials**

   - Go to `Credentials` tab
   - Set password (store securely)
   - Turn OFF "Temporary" (make permanent)

3. **Assign Admin Roles to Service Account**

   - Go to `Role Mappings` tab
   - Click `Assign role`
   - Select `Filter by clients` → `realm-management`
   - Assign these roles:
     ```
     manage-users
     manage-clients
     view-users
     query-users
     ```

4. **Enable Service Account**
   - Go to client settings: `Configure` → `Clients` → `subtitles` (or `kolman-dev`)
   - Go to `Settings` tab
   - Turn ON: `Service Accounts Enabled`
   - Turn ON: `Authorization Enabled`

### Step 4: Test Client Role Extraction

#### Verify JWT Token Contains Client Roles

1. **Login to Application**

   - Go to: `http://localhost:3000`
   - Login with test user

2. **Check Browser Console**

   - Open Developer Tools → Console
   - Look for debug logs:
     ```
     Checking client roles for client: kolman-dev
     Extracted security roles: ["admin", "operator", "translator"]
     ```

3. **Verify Token Structure**
   - In browser console, run:
     ```javascript
     // Check if resource_access exists
     console.log("Resource Access:", keycloak.resourceAccess);
     console.log("Client Roles:", keycloak.resourceAccess["kolman-dev"]);
     ```

### Step 5: Migration Verification

#### Test Role-Based Access

1. **Test Admin Access**

   - User with `subtitles_admin` should access all pages
   - Check navigation shows all menu items

2. **Test Operator Access**

   - User with `subtitles_operator` should access:
     - Subtitles page
     - Archive page
     - Source page
     - New page
   - Should NOT access admin features

3. **Test Translator Access**
   - User with `subtitles_translator` should access:
     - Question page only
   - Should NOT access other pages

### Step 6: Environment Variables

#### Backend Environment Variables

Add to backend `.env` files:

**Development:**

```bash
BSSVR_KEYCLOAK_CLIENT_ID=kolman-dev
```

**Production:**

```bash
BSSVR_KEYCLOAK_CLIENT_ID=subtitles
```

#### Frontend Environment Variables

**Already configured:**

- Development: `REACT_APP_KEYCLOAK_CLIENT_ID=kolman-dev`
- Production: `REACT_APP_KEYCLOAK_CLIENT_ID=subtitles`

### Step 7: Admin UI Integration (Future)

#### For Amnon's Built-in Admin UI Solutions

If you have existing admin UI components, here's how to integrate:

1. **Keycloak Admin Client Setup**

   ```javascript
   // Use Keycloak Admin REST API
   const adminClient = new KeycloakAdminClient({
     baseUrl: "https://auth.2serv.eu/auth",
     realmName: "master",
   });

   // Authenticate service account
   await adminClient.auth({
     username: "subtitles-admin-service",
     password: "service-account-password",
     grantType: "password",
     clientId: "kolman-dev",
   });
   ```

2. **User Management Functions**

   ```javascript
   // List all users
   const users = await adminClient.users.find();

   // Get user roles
   const userRoles = await adminClient.users.listClientRoleMappings({
     id: userId,
     clientUniqueId: clientId,
   });

   // Assign role to user
   await adminClient.users.addClientRoleMappings({
     id: userId,
     clientUniqueId: clientId,
     roles: [roleToAssign],
   });
   ```

3. **Required Admin UI Components**
   - User search/filter component
   - Role assignment interface
   - User role display component
   - Role management actions (assign/remove)

### Troubleshooting

#### Common Issues

1. **Roles Not Appearing in Token**

   - Check client has `Service Accounts Enabled`
   - Verify roles are assigned to correct client (not realm)
   - Check user has active session

2. **Admin API Access Denied**

   - Verify service account has correct roles
   - Check service account credentials
   - Ensure client has `Authorization Enabled`

3. **Frontend Not Reading Client Roles**
   - Check `REACT_APP_KEYCLOAK_CLIENT_ID` environment variable
   - Verify client ID matches exactly
   - Check browser console for debug logs

#### Verification Commands

**Check User Roles in Keycloak:**

```bash
# Using Keycloak CLI (if available)
kcadm.sh get users -r master --query username=slavapas13@gmail.com
kcadm.sh get-roles -r master --cclientid kolman-dev --uusername slavapas13@gmail.com
```

**Test JWT Token:**

```bash
# Decode JWT token (use online JWT decoder)
# Check for "resource_access" section
# Verify client roles are present
```

### Next Steps After Setup

1. **Test Application** with new client roles
2. **Remove Realm Role Dependencies** (Phase 3 of migration)
3. **Implement Admin UI** for role management
4. **Document Role Management Process** for future administrators

### Contact Information

- **Technical Questions**: Contact development team
- **Keycloak Admin Issues**: Contact system administrator
- **Role Assignment Requests**: Follow existing approval process
