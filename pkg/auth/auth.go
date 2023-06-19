package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
)

const (
	userRoleUrl = "https://auth.2serv.eu/auth/admin/realms/master/users/d76322f7-ef67-402c-b151-14193e23a890/role-mappings/realm"
	userInfoUrl = "https://auth.2serv.eu/auth/realms/master/protocol/openid-connect/userinfo"
)

type UserRole struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Composite   bool   `json:"composite"`
	ClientRole  bool   `json:"clientRole"`
	ContainerID string `json:"containerId"`
}

type UserInfo struct {
	Sub               string `json:"sub"`
	EmailVerified     bool   `json:"email_verified"`
	Name              string `json:"name"`
	PreferredUserName string `json:"preferred_username"`
	GivenName         string `json:"given_name"`
	FamilyName        string `json:"family_name"`
	Email             string `json:"email"`
}

type AuthError struct {
	Err            string `json:"error,omitempty"`
	ErrDescription string `json:"error_description,omitempty"`
}

func (r *AuthError) Error() string {
	errString := r.Err
	if len(r.ErrDescription) > 0 {
		errString += fmt.Sprintf(", %s", r.ErrDescription)
	}

	return errString
}

func GetUserRole(token string) ([]*UserRole, error) {
	resp, err := getAuthenticationInfo(userRoleUrl, token)
	if resp != nil {
		defer resp.Body.Close()
	}
	if err != nil {
		return nil, err
	}
	var userRoles []*UserRole
	err = json.NewDecoder(resp.Body).Decode(&userRoles)
	if err != nil {
		return nil, err
	}
	return userRoles, nil
}

func GetUserInfo(token string) (*UserInfo, error) {
	resp, err := getAuthenticationInfo(userInfoUrl, token)
	if resp != nil {
		defer resp.Body.Close()
	}
	if err != nil {
		return nil, err
	}
	var userInfo UserInfo
	err = json.NewDecoder(resp.Body).Decode(&userInfo)
	if err != nil {
		return nil, err
	}
	return &userInfo, nil
}

func getAuthenticationInfo(url, token string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := getHttpResp(token, req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode == http.StatusUnauthorized {
		var authError AuthError
		err = json.NewDecoder(resp.Body).Decode(&authError)
		if err != nil {
			return nil, err
		}
		return nil, &authError
	}

	return resp, nil
}

func getHttpResp(token string, req *http.Request) (*http.Response, error) {
	bearer := "Bearer " + token
	req.Header.Add("Authorization", bearer)
	client := &http.Client{}
	return client.Do(req)
}
