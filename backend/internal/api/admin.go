package api

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/Nerzal/gocloak/v13"
	"github.com/gin-gonic/gin"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
)

// Global mock users storage (in production, this would be Keycloak)
var (
	mockUsers = []UserInfo{
		{
			ID:            "1",
			Username:      "slava-admin-client",
			Email:         "slava-admin-client@gmail.com",
			FirstName:     "Slava",
			LastName:      "Admin",
			Enabled:       true,
			EmailVerified: true,
			Temporary:     true, // Default to true, matching Keycloak behavior
			Roles:         []string{"subtitles_admin"},
		},
		{
			ID:            "2",
			Username:      "slava-operator-client",
			Email:         "slava-operator-client@gmail.com",
			FirstName:     "Slava",
			LastName:      "Operator",
			Enabled:       true,
			EmailVerified: true,
			Temporary:     true, // Default to true, matching Keycloak behavior
			Roles:         []string{"subtitles_operator"},
		},
		{
			ID:            "3",
			Username:      "slava-translator-client",
			Email:         "slava-translator-client@gmail.com",
			FirstName:     "Slava",
			LastName:      "Translator",
			Enabled:       true,
			EmailVerified: false,
			Temporary:     true, // Default to true, matching Keycloak behavior
			Roles:         []string{"subtitles_translator"},
		},
	}
	mockUsersMutex sync.RWMutex
)

// AdminHandler handles admin-related API endpoints
type AdminHandler struct {
	realm          string
	clientId       string
	keycloakClient *gocloak.GoCloak
	adminToken     string
}

// UserInfo represents a user in the admin interface
type UserInfo struct {
	ID            string   `json:"id"`
	Username      string   `json:"username"`
	Email         string   `json:"email"`
	FirstName     string   `json:"firstName"`
	LastName      string   `json:"lastName"`
	Enabled       bool     `json:"enabled"`
	EmailVerified bool     `json:"emailVerified"`
	Temporary     bool     `json:"temporary"`
	Roles         []string `json:"roles,omitempty"`
}

// RoleInfo represents a role in the admin interface
type RoleInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// CreateUserRequest represents a request to create a new user
type CreateUserRequest struct {
	Email         string `json:"email" binding:"required"`
	FirstName     string `json:"firstName"`
	LastName      string `json:"lastName"`
	Enabled       bool   `json:"enabled"`
	EmailVerified bool   `json:"emailVerified"`
	Password      string `json:"password"`
	Temporary     bool   `json:"temporary"`
}

// RoleAssignmentRequest represents a request to assign a role
type RoleAssignmentRequest struct {
	RoleName string `json:"role_name" binding:"required"`
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler() *AdminHandler {
	realm := os.Getenv("BSSVR_KEYCLOAK_REALM")
	clientId := os.Getenv(config.EnvBssvrKeycloakClientId)
	keycloakURL := os.Getenv("BSSVR_KEYCLOAK_URL")

	// Initialize Keycloak client
	client := gocloak.NewClient(keycloakURL)

	return &AdminHandler{
		realm:          realm,
		clientId:       clientId,
		keycloakClient: client,
		adminToken:     "", // Will be set when we authenticate
	}
}

// authenticateAdmin authenticates with Keycloak using service account
func (h *AdminHandler) authenticateAdmin(ctx context.Context) error {
	// If we already have a valid token, use it
	if h.adminToken != "" {
		return nil
	}

	// Get service account credentials from environment
	clientSecret := os.Getenv("BSSVR_KEYCLOAK_CLIENT_SECRET")
	if clientSecret == "" {
		// Fall back to mock mode if no service account is configured
		return nil
	}

	// Authenticate with Keycloak using client credentials
	token, err := h.keycloakClient.LoginClient(ctx, h.clientId, clientSecret, h.realm)
	if err != nil {
		return fmt.Errorf("failed to authenticate with Keycloak: %v", err)
	}

	h.adminToken = token.AccessToken
	return nil
}

// ListUsers returns all users in the realm
func (h *AdminHandler) ListUsers(c *gin.Context) {
	ctx := context.Background()

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	// Get search parameter from query string
	searchTerm := c.Query("search")
	
	// Check if we have service account credentials
	clientSecret := os.Getenv("BSSVR_KEYCLOAK_CLIENT_SECRET")
	if clientSecret == "" {
		// Fall back to mock data if no service account is configured
		mockUsersMutex.RLock()
		users := make([]UserInfo, len(mockUsers))
		copy(users, mockUsers)
		mockUsersMutex.RUnlock()

		// Apply client-side filtering for mock data
		if searchTerm != "" {
			filteredUsers := []UserInfo{}
			for _, user := range users {
				if strings.Contains(strings.ToLower(user.Username), strings.ToLower(searchTerm)) ||
					strings.Contains(strings.ToLower(user.Email), strings.ToLower(searchTerm)) ||
					strings.Contains(strings.ToLower(user.FirstName), strings.ToLower(searchTerm)) ||
					strings.Contains(strings.ToLower(user.LastName), strings.ToLower(searchTerm)) {
					filteredUsers = append(filteredUsers, user)
				}
			}
			users = filteredUsers
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    users,
			"err":     "",
		})
		return
	}

	// Get users from Keycloak with search parameters
	params := gocloak.GetUsersParams{
		Max: gocloak.IntP(1000), // Increase limit to get more users
	}
	if searchTerm != "" {
		params.Search = &searchTerm
	}
	
	keycloakUsers, err := h.keycloakClient.GetUsers(ctx, h.adminToken, h.realm, params)
	if err != nil {
		handleResponse(c, http.StatusInternalServerError, "Failed to get users from Keycloak: "+err.Error())
		return
	}

	// Convert Keycloak users to our UserInfo format
	users := make([]UserInfo, len(keycloakUsers))
	for i, keycloakUser := range keycloakUsers {
		// For now, we'll set temporary to true by default (matching Keycloak behavior)
		// TODO: Implement proper temporary credential checking when gocloak supports it
		temporary := true

		// Add nil checks for pointer fields to prevent panic
		id := ""
		if keycloakUser.ID != nil {
			id = *keycloakUser.ID
		}
		username := ""
		if keycloakUser.Username != nil {
			username = *keycloakUser.Username
		}
		email := ""
		if keycloakUser.Email != nil {
			email = *keycloakUser.Email
		}
		firstName := ""
		if keycloakUser.FirstName != nil {
			firstName = *keycloakUser.FirstName
		}
		lastName := ""
		if keycloakUser.LastName != nil {
			lastName = *keycloakUser.LastName
		}
		enabled := true
		if keycloakUser.Enabled != nil {
			enabled = *keycloakUser.Enabled
		}
		emailVerified := false
		if keycloakUser.EmailVerified != nil {
			emailVerified = *keycloakUser.EmailVerified
		}

		// For now, skip individual role fetching to avoid performance issues
		// TODO: Implement batch role fetching or caching mechanism
		roles := []string{}

		users[i] = UserInfo{
			ID:            id,
			Username:      username,
			Email:         email,
			FirstName:     firstName,
			LastName:      lastName,
			Enabled:       enabled,
			EmailVerified: emailVerified,
			Temporary:     temporary,
			Roles:         roles,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
		"err":     "",
	})
}

// GetUserRoles returns the roles for a specific user
func (h *AdminHandler) GetUserRoles(c *gin.Context) {
	ctx := context.Background()
	userID := c.Param("user_id")

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	// Check if we have service account credentials
	clientSecret := os.Getenv("BSSVR_KEYCLOAK_CLIENT_SECRET")
	if clientSecret == "" {
		// Mock implementation for testing
		mockRoles := []string{"subtitles_admin"}
		if strings.Contains(userID, "operator") {
			mockRoles = []string{"subtitles_operator"}
		} else if strings.Contains(userID, "translator") {
			mockRoles = []string{"subtitles_translator"}
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    mockRoles,
			"err":     "",
		})
		return
	}

	// Get user roles from Keycloak
	roles := []string{}
	clientRoles, err := h.keycloakClient.GetClientRolesByUserID(ctx, h.adminToken, h.realm, h.clientId, userID)
	if err == nil {
		for _, role := range clientRoles {
			if role.Name != nil {
				roles = append(roles, *role.Name)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    roles,
		"err":     "",
	})
}

// CreateUser creates a new user
func (h *AdminHandler) CreateUser(c *gin.Context) {
	ctx := context.Background()

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		handleResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Auto-generate username from email (extract part before @)
	username := ""
	if req.Email != "" {
		emailParts := strings.Split(req.Email, "@")
		if len(emailParts) > 0 {
			username = emailParts[0]
		}
	}

	// Check if we have service account credentials
	clientSecret := os.Getenv("BSSVR_KEYCLOAK_CLIENT_SECRET")
	if clientSecret == "" {
		// Fall back to mock mode if no service account is configured
		newUser := UserInfo{
			ID:            fmt.Sprintf("mock-user-id-%d", len(mockUsers)+1),
			Username:      username,
			Email:         req.Email,
			FirstName:     req.FirstName,
			LastName:      req.LastName,
			Enabled:       req.Enabled,
			EmailVerified: req.EmailVerified,
			Roles:         []string{}, // No roles assigned initially
		}

		// Add to mock users list
		mockUsersMutex.Lock()
		mockUsers = append(mockUsers, newUser)
		mockUsersMutex.Unlock()

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    newUser,
			"err":     "",
		})
		return
	}

	// Create user in Keycloak
	keycloakUser := gocloak.User{
		Username:      &username,
		Email:         &req.Email,
		FirstName:     &req.FirstName,
		LastName:      &req.LastName,
		Enabled:       &req.Enabled,
		EmailVerified: &req.EmailVerified,
	}

	userID, err := h.keycloakClient.CreateUser(ctx, h.adminToken, h.realm, keycloakUser)
	if err != nil {
		handleResponse(c, http.StatusInternalServerError, "Failed to create user in Keycloak: "+err.Error())
		return
	}

	// Set password if provided
	if req.Password != "" {
		err = h.keycloakClient.SetPassword(ctx, h.adminToken, userID, h.realm, req.Password, req.Temporary)
		if err != nil {
			// Log the error but don't fail the user creation
			fmt.Printf("Warning: Failed to set password for user %s: %v\n", userID, err)
		}
	}

	// Return the created user
	newUser := UserInfo{
		ID:            userID,
		Username:      username,
		Email:         req.Email,
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		Enabled:       req.Enabled,
		EmailVerified: req.EmailVerified,
		Roles:         []string{}, // No roles assigned initially
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    newUser,
		"err":     "",
	})
}

// UpdateUser updates an existing user
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	ctx := context.Background()
	userID := c.Param("user_id")

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		handleResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Auto-generate username from email (extract part before @)
	username := ""
	if req.Email != "" {
		emailParts := strings.Split(req.Email, "@")
		if len(emailParts) > 0 {
			username = emailParts[0]
		}
	}

	// Check if we have service account credentials
	clientSecret := os.Getenv("BSSVR_KEYCLOAK_CLIENT_SECRET")
	if clientSecret == "" {
		// Fall back to mock mode if no service account is configured
		mockUsersMutex.Lock()
		for i, user := range mockUsers {
			if user.ID == userID {
				mockUsers[i].Username = username
				mockUsers[i].Email = req.Email
				mockUsers[i].FirstName = req.FirstName
				mockUsers[i].LastName = req.LastName
				mockUsers[i].Enabled = req.Enabled
				mockUsers[i].EmailVerified = req.EmailVerified
				break
			}
		}
		mockUsersMutex.Unlock()

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"id":            userID,
				"username":      username,
				"email":         req.Email,
				"firstName":     req.FirstName,
				"lastName":      req.LastName,
				"enabled":       req.Enabled,
				"emailVerified": req.EmailVerified,
			},
			"err": "",
		})
		return
	}

	// Update user in Keycloak
	keycloakUser := gocloak.User{
		ID:            &userID,
		Username:      &username,
		Email:         &req.Email,
		FirstName:     &req.FirstName,
		LastName:      &req.LastName,
		Enabled:       &req.Enabled,
		EmailVerified: &req.EmailVerified,
	}

	err := h.keycloakClient.UpdateUser(ctx, h.adminToken, h.realm, keycloakUser)
	if err != nil {
		handleResponse(c, http.StatusInternalServerError, "Failed to update user in Keycloak: "+err.Error())
		return
	}

	// Update password if provided
	if req.Password != "" {
		err = h.keycloakClient.SetPassword(ctx, h.adminToken, userID, h.realm, req.Password, req.Temporary)
		if err != nil {
			handleResponse(c, http.StatusInternalServerError, "Failed to update password in Keycloak: "+err.Error())
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":            userID,
			"username":      username,
			"email":         req.Email,
			"firstName":     req.FirstName,
			"lastName":      req.LastName,
			"enabled":       req.Enabled,
			"emailVerified": req.EmailVerified,
		},
		"err": "",
	})
}

// DeleteUser deletes a user
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	ctx := context.Background()
	userID := c.Param("user_id")

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	// TODO: Replace with actual Keycloak API call
	// For now, remove from mock users list
	mockUsersMutex.Lock()
	for i, user := range mockUsers {
		if user.ID == userID {
			mockUsers = append(mockUsers[:i], mockUsers[i+1:]...)
			break
		}
	}
	mockUsersMutex.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    fmt.Sprintf("User %s deleted successfully", userID),
		"err":     "",
	})
}

// AssignUserRole assigns a role to a user
func (h *AdminHandler) AssignUserRole(c *gin.Context) {
	ctx := context.Background()
	userID := c.Param("user_id")

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	var req RoleAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		handleResponse(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Check if we have service account credentials
	clientSecret := os.Getenv("BSSVR_KEYCLOAK_CLIENT_SECRET")
	if clientSecret == "" {
		// Mock implementation for testing
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    fmt.Sprintf("Role %s assigned to user %s successfully", req.RoleName, userID),
			"err":     "",
		})
		return
	}

	// Get the role from Keycloak
	role, err := h.keycloakClient.GetClientRole(ctx, h.adminToken, h.realm, h.clientId, req.RoleName)
	if err != nil {
		handleResponse(c, http.StatusNotFound, "Role not found: "+err.Error())
		return
	}

	// Assign the role to the user
	err = h.keycloakClient.AddClientRoleToUser(ctx, h.adminToken, h.realm, h.clientId, userID, []gocloak.Role{*role})
	if err != nil {
		handleResponse(c, http.StatusInternalServerError, "Failed to assign role: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    fmt.Sprintf("Role %s assigned to user %s successfully", req.RoleName, userID),
		"err":     "",
	})
}

// RemoveUserRole removes a role from a user
func (h *AdminHandler) RemoveUserRole(c *gin.Context) {
	ctx := context.Background()
	userID := c.Param("user_id")
	roleName := c.Param("role")

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	// Check if we have service account credentials
	clientSecret := os.Getenv("BSSVR_KEYCLOAK_CLIENT_SECRET")
	if clientSecret == "" {
		// Mock implementation for testing
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    fmt.Sprintf("Role %s removed from user %s successfully", roleName, userID),
			"err":     "",
		})
		return
	}

	// Get the role from Keycloak
	role, err := h.keycloakClient.GetClientRole(ctx, h.adminToken, h.realm, h.clientId, roleName)
	if err != nil {
		handleResponse(c, http.StatusNotFound, "Role not found: "+err.Error())
		return
	}

	// Remove the role from the user
	err = h.keycloakClient.DeleteClientRoleFromUser(ctx, h.adminToken, h.realm, h.clientId, userID, []gocloak.Role{*role})
	if err != nil {
		handleResponse(c, http.StatusInternalServerError, "Failed to remove role: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    fmt.Sprintf("Role %s removed from user %s successfully", roleName, userID),
		"err":     "",
	})
}

// ListAvailableRoles returns all available client roles
func (h *AdminHandler) ListAvailableRoles(c *gin.Context) {
	ctx := context.Background()

	if err := h.authenticateAdmin(ctx); err != nil {
		handleResponse(c, http.StatusUnauthorized, "Admin authentication failed: "+err.Error())
		return
	}

	// Return the available client roles
	roles := []RoleInfo{
		{
			ID:          "subtitles_admin",
			Name:        "Admin",
			Description: "Full access to subtitles application + role management",
		},
		{
			ID:          "subtitles_operator",
			Name:        "Operator",
			Description: "Access to Subtitles, Archive, Source, New pages",
		},
		{
			ID:          "subtitles_translator",
			Name:        "Translator",
			Description: "Access to Question page",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    roles,
		"err":     "",
	})
}

// RequireAdminRole middleware to check if user has admin role
func RequireAdminRole() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user roles from context (set by UserRoleHandler middleware)
		userRoles, exists := c.Get("user_roles")
		if !exists {
			handleResponse(c, http.StatusUnauthorized, "User roles not found")
			return
		}

		roles, ok := userRoles.([]string)
		if !ok {
			handleResponse(c, http.StatusUnauthorized, "Invalid user roles format")
			return
		}

		// Check if user has admin role
		hasAdmin := false
		for _, role := range roles {
			if role == "admin" {
				hasAdmin = true
				break
			}
		}

		if !hasAdmin {
			handleResponse(c, http.StatusForbidden, "Admin role required")
			return
		}

		c.Next()
	}
}
