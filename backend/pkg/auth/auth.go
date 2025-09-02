package auth

import (
	"context"
	"log"
	"os"

	"github.com/coreos/go-oidc"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
)

var provider *oidc.Provider

// For future usage: user role management
// type Roles struct {
// 	Roles []string `json:"roles"`
// }

type IDTokenClaims struct {
	Email      string `json:"email"`
	Exp        int    `json:"exp"`
	FamilyName string `json:"family_name"`
	GivenName  string `json:"given_name"`
	Name       string `json:"name"`
	// RealmAccess    Roles            `json:"realm_access"`
	Sub string `json:"sub"`

	// For future usage
	// rolesMap map[string]struct{}
}

// For future usage: user role management
// func (c *IDTokenClaims) initRoleMap() {
// 	if c.rolesMap == nil {
// 		c.rolesMap = make(map[string]struct{})
// 		if c.RealmAccess.Roles != nil {
// 			for _, r := range c.RealmAccess.Roles {
// 				c.rolesMap[r] = struct{}{}
// 			}
// 		}
// 	}
// }

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
