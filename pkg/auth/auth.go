package auth

import (
	"context"
	"fmt"

	"github.com/coreos/go-oidc"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
)

type Roles struct {
	Roles []string `json:"roles"`
}

type IDTokenClaims struct {
	Acr               string           `json:"acr"`
	AllowedOrigins    []string         `json:"allowed-origins"`
	Aud               interface{}      `json:"aud"`
	AuthTime          int              `json:"auth_time"`
	Azp               string           `json:"azp"`
	Email             string           `json:"email"`
	Exp               int              `json:"exp"`
	FamilyName        string           `json:"family_name"`
	GivenName         string           `json:"given_name"`
	Iat               int              `json:"iat"`
	Iss               string           `json:"iss"`
	Jti               string           `json:"jti"`
	Name              string           `json:"name"`
	Nbf               int              `json:"nbf"`
	Nonce             string           `json:"nonce"`
	PreferredUsername string           `json:"preferred_username"`
	RealmAccess       Roles            `json:"realm_access"`
	ResourceAccess    map[string]Roles `json:"resource_access"`
	SessionState      string           `json:"session_state"`
	Sub               string           `json:"sub"`
	Typ               string           `json:"typ"`

	rolesMap map[string]struct{}
}

func (c *IDTokenClaims) initRoleMap() {
	if c.rolesMap == nil {
		c.rolesMap = make(map[string]struct{})
		if c.RealmAccess.Roles != nil {
			for _, r := range c.RealmAccess.Roles {
				c.rolesMap[r] = struct{}{}
			}
		}
	}
}

func GetClaims(ctx context.Context, tokenStr string) (*IDTokenClaims, error) {
	provider, err := oidc.NewProvider(ctx, config.Configuration.KeyCloak.Url)
	if err != nil {
		return nil, err
	}

	verifier := provider.Verifier(&oidc.Config{
		SkipClientIDCheck: true,
	})

	token, err := verifier.Verify(ctx, tokenStr)
	if err != nil {
		return nil, err
	}

	var claims IDTokenClaims
	if err := token.Claims(&claims); err != nil {
		fmt.Println(err)
	}
	claims.initRoleMap()

	return &claims, nil
}
