package auth

import (
	"reflect"
	"testing"
)

func TestGetUserRole(t *testing.T) {
	tests := []struct {
		token string
		want  []*UserRole
	}{
		{"eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJlTnVZcklpN1hHYWhjZGhhbmtCSmp6VVFGdjh3OVlrRHZIeVpPQkRKSElzIn0.eyJleHAiOjE3NTM3NzQ0MTQsImlhdCI6MTY2NzM3NDQxNCwianRpIjoiODg1MjYwZjQtM2VmNC00ZTVhLThhMDgtZWZlNmUzN2JkODk0IiwiaXNzIjoiaHR0cHM6Ly9hdXRoLjJzZXJ2LmV1L2F1dGgvcmVhbG1zL21hc3RlciIsImF1ZCI6ImFyZ29jZCIsInN1YiI6ImQ3NjMyMmY3LWVmNjctNDAyYy1iMTUxLTE0MTkzZTIzYTg5MCIsInR5cCI6IkJlYXJlciIsImF6cCI6ImFkbWluLWNsaSIsInNlc3Npb25fc3RhdGUiOiI5ZDgyNDAxMC1iMjE2LTRmNmYtOWExNC01NjdmNTFjNGE1OTYiLCJhY3IiOiIxIiwic2NvcGUiOiJwcm9maWxlIGVtYWlsIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJEb25nZ2VvbiBMZWUgYmFjay1lbmQgZGV2IEdPIiwicHJlZmVycmVkX3VzZXJuYW1lIjoicm9ja3kyMDEwYWFhQGdtYWlsLmNvbSIsImdpdmVuX25hbWUiOiJEb25nZ2VvbiIsImZhbWlseV9uYW1lIjoiTGVlIGJhY2stZW5kIGRldiBHTyIsImVtYWlsIjoicm9ja3kyMDEwYWFhQGdtYWlsLmNvbSJ9.q7I6prwz8cKVKCIXy7k4e1fWHK1YF9mIRyI6PLaxYl1tSW0MA0w3aPPwWg74c9earT8sC-Y5BEKH0RKcHwIn0IhqIlMwP7D4PLpGNnmgN1_ijqLC-rJgKA_iNA0Z9vtQtef68_mPIa8fW7ymcxBUzxmESGnuQ9gkBFxGucfTKlkhWltkrs3-pYLX_HRbW4N0glNeMhX169W4ewwpmjY4rA2JaO8mLyaTiQr68JdR_GmI9eCHBfHQlXmNCnMI6wq_7hDO2Dw19UsP9leOa3xWpg225nVz8QBzHRj4Oqj12P3yQ2A5A7iRdms3qGWFU3KTm7cWIFvNpeq_cUVhtr6KWw",
			[]*UserRole{
				&UserRole{
					ID:          "0283a7e5-ac31-44a0-85c2-4f98d7f3775b",
					Name:        "mb_admin_users_finstats",
					Description: "access to finstats",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "12c48484-616a-4b39-b613-206778955908",
					Name:        "test",
					Description: "test",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "cb6b901d-18eb-4838-8b12-9b80654c4a12",
					Name:        "uma_authorization",
					Description: "${role_uma_authorization}",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "aa954bd5-579c-4a3f-8aac-5e2c35d99bb1",
					Name:        "mb_admin_users",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "cdcff2b2-34bc-4763-accb-e926b4a10777",
					Name:        "admin-users",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "e4aaa423-e359-4637-88e2-8a3192557300",
					Name:        "sb-ru-admin",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "8f07be46-ead4-4ecd-8af0-27abfdb472fd",
					Name:        "mb_admin_questions",
					Description: "Users for questions admin",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "eb5d873f-b403-492f-b4cf-0ec812751ac1",
					Name:        "admin",
					Description: "${role_admin}",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "13a02742-4bb3-43bb-8bc5-60cf52cd6486",
					Name:        "offline_access",
					Description: "${role_offline-access}",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
				&UserRole{
					ID:          "dec67634-e5bb-4053-823c-6e4a439c90fd",
					Name:        "mb_admin_events_edit",
					Composite:   false,
					ClientRole:  false,
					ContainerID: "master",
				},
			},
		},
	}

	for _, test := range tests {
		userRoles, err := GetUserRole(test.token)
		if err != nil {
			t.Errorf("error: %s", err.Error())
		}
		if !reflect.DeepEqual(userRoles, test.want) {
			t.Errorf("expected: %+v, got: %+v\n", userRoles, test.want)
		}
	}
}
