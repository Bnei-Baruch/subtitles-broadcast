import React, { useState, useEffect } from "react";
import Keycloak from "keycloak-js";
import { useDispatch } from "react-redux";
import ErrorLogin from "../Pages/Views/ErrorLogin";
import { StoreProfile } from "../Redux/UserProfile/UserProfileSlice";
import PropTypes from "prop-types";
import debugLog from "../Utils/debugLog";


const TOKEN_REFRESH_INTERVAL_SECONDS = 10;
const TOKEN_TTL_TIMEOUT_SECONDS = 33;

const Auth = ({ children }) => {
  const [auth, setAuth] = useState({
    keycloak: null,
    authenticated: false,
    securityProfile: null,
    securityRole: null,
  });
  const [access, setAccess] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    var authRealm = process.env.REACT_APP_KEYCLOAK_REALM;
    var authClientId = process.env.REACT_APP_KEYCLOAK_CLIENT_ID;
    var authApiUrl = process.env.REACT_APP_KEYCLOAK_URL;

    debugLog("authRealm: ", authRealm);
    debugLog("authClientId: ", authClientId);
    debugLog("authApiUrl: ", authApiUrl);

    if (!authRealm || !authClientId || !authApiUrl) {
      console.error(
        "Keycloak configuration is missing due to missing environment variables"
      );
      return;
    }

    const keycloak = new Keycloak({
      realm: authRealm,
      url: authApiUrl,
      clientId: authClientId,
    });

    keycloak
      .init({
        onLoad: "login-required",
        checkLoginIframe: false,
        // redirectUri: window.location.origin,
      })
      .then((authenticated) => {
        const securityRole = determineAccess(keycloak, setAccess);

        if (authenticated) {
          setInterval(() => {
            keycloak.updateToken(TOKEN_TTL_TIMEOUT_SECONDS).then((refreshed, something) => {
              if (refreshed) {
                console.log('Token refreshed successfully.');
                localStorage.setItem("token", keycloak.token);
              }
            });
          }, TOKEN_REFRESH_INTERVAL_SECONDS*1000);
        }

        keycloak.loadUserProfile().then(function () {
          const profile = {
            username: keycloak.profile.username,
            firstName: keycloak.profile.firstName,
            lastName: keycloak.profile.lastName,
            email: keycloak.profile.email,
            token: keycloak.token,

            // TODO: Add gender to the response
            gender: "male",
            securityRole: securityRole,
          };
          // profile.logout = keycloak.logout;
          dispatch(StoreProfile({ profile }));
          localStorage.setItem("token", keycloak.token);
          setAuth({
            keycloak,
            authenticated,
            profile,
            securityRole,
          });
        });
      });
  }, [dispatch]);

  if (auth.keycloak) {
    if (auth.authenticated) {
      if (access) {
        return <>{children(auth)}</>;
      } else {
        return <div>User don't have Rights to view this application</div>;
      }
    } else {
      return (
        <>
          <ErrorLogin />
        </>
      );
    }
  }
};

Auth.propTypes = {
  children: PropTypes.func.isRequired, // PropTypes validation for children prop
};

function determineAccess(keycloak, setAccess) {
  let securityRole = null;

  if (keycloak && keycloak.realmAccess) {
    const subtitlesRoleRex = new RegExp(
      "subtitles_(?<role>.*)|(?<admin_role>admin)"
    );

    for (let index = 0; index < keycloak.realmAccess.roles.length; index++) {
      const role = keycloak.realmAccess.roles[index];
      const subtitlesRoleMatchRes = role.match(subtitlesRoleRex);

      if (subtitlesRoleMatchRes && subtitlesRoleMatchRes.groups) {
        securityRole = subtitlesRoleMatchRes.groups.role
          ? subtitlesRoleMatchRes.groups.role
          : subtitlesRoleMatchRes.groups.admin_role;
        setAccess(true);
        break;
      }
    }
  }

  return securityRole;
}

export default Auth;
