package auth

import (
	"context"
	"log"
	"os"

	"github.com/coreos/go-oidc"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
)

var provider *oidc.Provider

// Roles represents the roles structure in Keycloak tokens
type Roles struct {
	Roles []string `json:"roles"`
}

// ResourceAccess represents the resource_access structure in Keycloak tokens
type ResourceAccess map[string]Roles

type IDTokenClaims struct {
	Email      string `json:"email"`
	Exp        int    `json:"exp"`
	FamilyName string `json:"family_name"`
	GivenName  string `json:"given_name"`
	Name       string `json:"name"`
	Sub        string `json:"sub"`

	// Support both realm and client roles for backward compatibility
	RealmAccess    *Roles          `json:"realm_access"`
	ResourceAccess *ResourceAccess `json:"resource_access"`
}

// GetClientRoles extracts roles for a specific client from resource_access
func (c *IDTokenClaims) GetClientRoles(clientId string) []string {
	if c.ResourceAccess == nil {
		return []string{}
	}

	clientRoles, ok := (*c.ResourceAccess)[clientId]
	if !ok {
		return []string{}
	}

	return clientRoles.Roles
}

// GetRealmRoles extracts roles from realm_access
func (c *IDTokenClaims) GetRealmRoles() []string {
	if c.RealmAccess == nil {
		return []string{}
	}
	return c.RealmAccess.Roles
}

// HasRole checks if the user has a specific role (checks both client and realm roles)
func (c *IDTokenClaims) HasRole(clientId, role string) bool {
	// Check client roles first
	clientRoles := c.GetClientRoles(clientId)
	for _, r := range clientRoles {
		if r == role {
			return true
		}
	}

	// Fallback to realm roles for backward compatibility
	realmRoles := c.GetRealmRoles()
	for _, r := range realmRoles {
		if r == role {
			return true
		}
	}

	return false
}

func init() {
	var err error
	provider, err = oidc.NewProvider(context.TODO(), os.Getenv(config.EnvBssvrKeycloakUri))
	if err != nil {
		log.Fatalf("Error get oidc provider: %v", err)
	}
}

func GetClaims(ctx context.Context, tokenStr string) (*IDTokenClaims, error) {
	verifier := provider.Verifier(&oidc.Config{
		SkipClientIDCheck: true,
	})

	token, err := verifier.Verify(ctx, tokenStr)
	if err != nil {
		return nil, err
	}

	var claims IDTokenClaims
	if err := token.Claims(&claims); err != nil { // keeps claim process to get user uuid
		return nil, err
	}
	// For future usage: user role management
	//claims.initRoleMap()

	return &claims, nil
}
