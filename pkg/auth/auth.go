package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
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

func GetUserRole(token string) ([]*UserRole, error) {
	req, err := http.NewRequest("GET", userRoleUrl, nil)
	if err != nil {
		return nil, err
	}
	resp, err := getHttpResp(token, req)
	if resp != nil {
		defer resp.Body.Close()
	}
	if err != nil {
		return nil, err
	}
	if resp.StatusCode == 401 {
		_, err = io.Copy(ioutil.Discard, resp.Body)
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("not authorized")
	}
	var userRoles []*UserRole
	err = json.NewDecoder(resp.Body).Decode(&userRoles)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	return userRoles, nil
}

func GetUserInfo(token string) (*UserInfo, error) {
	req, err := http.NewRequest("GET", userInfoUrl, nil)
	if err != nil {
		return nil, err
	}
	resp, err := getHttpResp(token, req)
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

func getHttpResp(token string, req *http.Request) (*http.Response, error) {
	bearer := "Bearer " + token
	req.Header.Add("Authorization", bearer)
	client := &http.Client{}
	return client.Do(req)
}
