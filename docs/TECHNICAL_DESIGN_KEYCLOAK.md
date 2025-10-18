# Technical Design: Keycloak Client Roles Migration & Admin Role Management

## Overview

✅ **COMPLETED**: Successfully migrated the Subtitles Broadcast application from using Keycloak **Realm roles** to **Client roles**, and implemented a complete admin interface for managing user roles with pagination and security improvements.

## Implementation Status

### ✅ Completed Features
- **Client Role Migration**: Frontend and backend now use client roles with realm role fallback
- **Admin Role Management UI**: Complete web interface for user and role management
- **User Management**: Create, update, delete users with password and temporary flag support
- **Role Assignment**: Assign and remove client roles with realm role fallback
- **Pagination**: Efficient handling of large user lists (50 users per page)
- **Security**: Removed all sensitive `.env` files from repository
- **Documentation**: Organized documentation in `docs/` folder
- **Performance**: Optimized role fetching to eliminate timeout errors

---

## Implementation Details

### ✅ Frontend Implementation

**Location**: `frontend/src/Utils/Auth.js`
**Status**: ✅ COMPLETED

- **Client Role Support**: Reads roles from `keycloak.resourceAccess[clientId].roles`
- **Realm Role Fallback**: Falls back to `keycloak.realmAccess.roles` for backward compatibility
- **Role Pattern**: Filters for roles matching `subtitles_*` or `admin`
- **Security Roles**: Extracts `operator`, `translator`, `admin`
- **Admin Detection**: Added `isAdmin()` helper function

### ✅ Backend Implementation

**Location**: `backend/pkg/auth/auth.go`
**Status**: ✅ COMPLETED

- **JWT Token Verification**: Complete OIDC provider integration
- **Role Extraction**: Extracts both client and realm roles from JWT
- **Resource Access**: Added `ResourceAccess` struct for client roles
- **Helper Methods**: `GetClientRoles()`, `GetRealmRoles()`, `HasRole()`

### ✅ Admin Interface

**Location**: `frontend/src/Pages/AdminRoleManagement.jsx`
**Status**: ✅ COMPLETED

- **User Management**: Complete CRUD operations for users
- **Role Assignment**: Assign/remove roles with real-time updates
- **Search & Pagination**: Server-side search with 50 users per page
- **Password Management**: Set passwords with confirmation and temporary flag
- **UI Components**: Modern Bootstrap-based interface with modals and forms

### ✅ Backend API

**Location**: `backend/internal/api/admin.go`
**Status**: ✅ COMPLETED

- **Keycloak Integration**: Using `gocloak/v13` library
- **Service Account**: `kolman-dev-service` for backend authentication
- **Client Role Management**: Access to `kolman-dev` client roles
- **Realm Role Fallback**: Falls back to realm roles when client roles fail
- **Performance Optimization**: Efficient role fetching with pagination

### ✅ Security Implementation

**Status**: ✅ COMPLETED

- **Environment Security**: All sensitive `.env` files removed from repository
- **Template Files**: Secure `.env.template` files with placeholder values
- **Documentation**: Complete setup guides in `docs/` folder
- **Git Protection**: `.gitignore` configured to exclude sensitive files

---

## Keycloak Configuration Solution

### ✅ Custom Realm Roles Implementation

**Problem Solved**: Service account `kolman-dev-service` couldn't access `kolman-dev` client roles due to missing permissions.

**Solution**: Created custom realm roles to grant proper permissions:

#### Custom Realm Roles Created:
- ✅ **`view-clients`** - Permission to view clients
- ✅ **`manage-clients`** - Permission to manage client roles
- ✅ **`view-users`** - Permission to view users  
- ✅ **`manage-users`** - Permission to manage user roles

#### Configuration Details:
- **Composite Roles**: Set to **OFF** (simple permissions, not role containers)
- **Description**: Clear permission descriptions
- **Assignment**: All roles assigned to `kolman-dev-service` service account

#### Environment Configuration:
```bash
# Service Account Client (for backend authentication)
BSSVR_KEYCLOAK_CLIENT_ID=YOUR_SERVICE_CLIENT_ID
BSSVR_KEYCLOAK_CLIENT_SECRET=YOUR_SERVICE_CLIENT_SECRET

# Application Client (where roles are defined)
BSSVR_KEYCLOAK_APP_CLIENT_ID=YOUR_APP_CLIENT_ID
```

### ✅ Role Management Flow

**Current Implementation**:
1. **Client Role Access**: Backend tries to access `kolman-dev` client roles first
2. **Realm Role Fallback**: If client access fails, falls back to realm roles
3. **Custom Permissions**: Custom realm roles provide necessary permissions
4. **Seamless Operation**: Users can assign/remove roles without errors

**Debug Logs** (when working correctly):
```
DEBUG: Looking for role 'subtitles_admin' in client 'kolman-dev' in realm 'master'
DEBUG: Found client role: {id: "...", name: "subtitles_admin", ...}
```

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

- [x] ✅ Application uses client roles instead of realm roles
- [x] ✅ Admin users can manage user roles via web interface
- [x] ✅ No disruption to existing user access during migration
- [x] ✅ All role checks function correctly in both frontend and backend
- [x] ✅ Admin actions are properly logged and auditable
- [x] ✅ Documentation updated with new role management process
- [x] ✅ Performance optimized with pagination (50 users per page)
- [x] ✅ Security improved (no sensitive data in repository)
- [x] ✅ Custom realm roles implemented for service account permissions
- [x] ✅ Complete user management (create, update, delete, password management)

---

## Keycloak Setup Requirements

### Overview

This section outlines the Keycloak configuration requirements for the Subtitles Broadcast application to enable client role management and admin functionality.

### Environment Configuration

#### Required Environment Variables

**Backend Configuration:**
```bash
# Service Account Client (for backend authentication)
BSSVR_KEYCLOAK_CLIENT_ID=YOUR_SERVICE_CLIENT_ID
BSSVR_KEYCLOAK_CLIENT_SECRET=YOUR_SERVICE_CLIENT_SECRET

# Application Client (where roles are defined)
BSSVR_KEYCLOAK_APP_CLIENT_ID=YOUR_APP_CLIENT_ID

# Keycloak Server Configuration
BSSVR_KEYCLOAK_URL=https://your-keycloak-server.com/auth
BSSVR_KEYCLOAK_REALM=your-realm-name
```

**Frontend Configuration:**
```bash
REACT_APP_KEYCLOAK_URL=https://your-keycloak-server.com/auth
REACT_APP_KEYCLOAK_REALM=your-realm-name
REACT_APP_KEYCLOAK_CLIENT_ID=YOUR_APP_CLIENT_ID
```

### Keycloak Client Setup Requirements

#### 1. Application Client Configuration

**Client Settings:**
- **Client ID**: `YOUR_APP_CLIENT_ID` (e.g., `subtitles`, `kolman-dev`)
- **Client Type**: OpenID Connect
- **Access Type**: Public (for frontend authentication)
- **Valid Redirect URIs**: `http://localhost:3000/*` (development), `https://your-domain.com/*` (production)
- **Web Origins**: `http://localhost:3000` (development), `https://your-domain.com` (production)

**Required Client Roles:**
   ```
   Role Name: subtitles_admin
   Description: Full access to subtitles application + role management

   Role Name: subtitles_operator
   Description: Access to Subtitles, Archive, Source, New pages

   Role Name: subtitles_translator
   Description: Access to Question page
   ```

#### 2. Service Account Client Configuration

**Client Settings:**
- **Client ID**: `YOUR_SERVICE_CLIENT_ID` (e.g., `subtitles-service`, `kolman-dev-service`)
- **Client Type**: OpenID Connect
- **Access Type**: Confidential
- **Service Accounts Enabled**: ON
- **Authorization Enabled**: ON

**Required Service Account Permissions:**
The service account needs custom realm roles with the following permissions:
```
Role Name: view-clients
Description: Permission to view clients

Role Name: manage-clients
Description: Permission to manage client roles

Role Name: view-users
Description: Permission to view users

Role Name: manage-users
Description: Permission to manage user roles
```

**Note**: These custom realm roles should be created with "Composite Roles: OFF" and assigned to the service account.

### Implementation Status

#### ✅ Completed Features
- **Client Role Migration**: Application successfully uses client roles with realm role fallback
- **Admin Interface**: Complete web-based user and role management system
- **Service Account Integration**: Backend authenticates with Keycloak using service account
- **Custom Realm Roles**: Implemented custom permissions for service account access
- **Performance Optimization**: Efficient role fetching with pagination and caching

#### 🔧 Technical Implementation

**Backend Architecture:**
- **Authentication**: Service account with custom realm roles
- **Client UUID Resolution**: Automatic lookup and caching of client UUIDs
- **Role Management**: Full CRUD operations for user roles
- **Error Handling**: Graceful fallback to realm roles when client roles fail

**Frontend Architecture:**
- **Authentication**: Public client with PKCE flow
- **Role Display**: Truncated role display with tooltips for better UX
- **Admin Interface**: Complete user and role management with pagination
- **Responsive Design**: Bootstrap-based UI with consistent styling

### Security Considerations

1. **Environment Variables**: Use secure environment variable management
2. **Service Account**: Store service account credentials securely
3. **Client Secrets**: Rotate secrets regularly
4. **Access Control**: Implement proper role-based access control
5. **Audit Logging**: Monitor role assignment and removal activities

### Troubleshooting

#### Common Issues

1. **"Client not found" errors**: Ensure client UUID resolution is working
2. **Permission denied**: Verify service account has required custom realm roles
3. **Role not displaying**: Check client role assignment and token claims
4. **Authentication failures**: Verify client configuration and secrets

#### Verification Steps

1. **Test Client Role Access**: Verify backend can fetch client roles
2. **Test Role Assignment**: Assign roles via admin interface
3. **Test User Authentication**: Verify frontend authentication works
4. **Test Role Display**: Confirm roles appear correctly in UI

---

## Current Status & Next Steps

### ✅ Implementation Complete

**All major objectives have been achieved:**

1. **✅ Client Role Migration**: Application successfully uses client roles with realm role fallback
2. **✅ Admin Interface**: Complete web-based user and role management system
3. **✅ Performance**: Pagination and optimization eliminate timeout errors
4. **✅ Security**: Repository is secure with no sensitive data exposed
5. **✅ Documentation**: Complete setup guides and technical documentation

### 🎯 Current Capabilities

**Admin Users Can:**
- ✅ View all users with search and pagination
- ✅ Create new users with password and temporary flag
- ✅ Update user information and passwords
- ✅ Assign client roles (`subtitles_admin`, `subtitles_operator`, `subtitles_translator`)
- ✅ Remove roles from users
- ✅ Manage user status (enabled/disabled, email verified)

**System Features:**
- ✅ Real-time role updates
- ✅ Server-side search and pagination
- ✅ Password confirmation and show/hide toggles
- ✅ Error handling with user-friendly messages
- ✅ Responsive Bootstrap-based UI

### 🔧 Technical Architecture

**Frontend**: React with Bootstrap UI components
**Backend**: Go with Gin framework and gocloak integration
**Authentication**: Keycloak with service account and client roles
**Database**: PostgreSQL (for application data, Keycloak for user management)

### 📋 Maintenance Tasks

**For Future Administrators:**
1. **User Management**: Use the admin interface at `/admin/roles`
2. **Role Assignment**: Assign appropriate roles based on user responsibilities
3. **Environment Setup**: Use `.env.template` files for new deployments
4. **Monitoring**: Check backend logs for role management operations

### 🚀 Future Enhancements

**Potential Improvements:**
- **Bulk Operations**: Assign roles to multiple users at once
- **Role Templates**: Predefined role combinations for common user types
- **Audit Logging**: Enhanced logging of role changes
- **Email Notifications**: Notify users when roles are assigned/removed
- **Role Expiration**: Time-based role assignments

### Contact Information

- **Technical Questions**: Contact development team
- **Keycloak Admin Issues**: Contact system administrator
- **Role Assignment Requests**: Use the admin interface at `/admin/roles`
