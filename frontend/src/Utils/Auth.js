import React, { useState, useEffect } from "react";
import Keycloak from "keycloak-js";
import { useDispatch } from "react-redux";
import ErrorLogin from "../Pages/Views/ErrorLogin";
import { StoreProfile } from "../Redux/UserProfile/UserProfileSlice";
import PropTypes from "prop-types";
import debugLog from "../Utils/debugLog";


const TOKEN_REFRESH_INTERVAL_SECONDS = 10;
const TOKEN_TTL_TIMEOUT_SECONDS = 33;

export const isAdmin = (securityRoles) =>
  securityRoles && securityRoles.includes("admin");

export const isOperator = (securityRoles) =>
  securityRoles && (securityRoles.includes("operator") || securityRoles.includes("admin"));

export const isTranslator = (securityRoles) =>
  securityRoles && (securityRoles.includes("translator") || securityRoles.includes("admin"));

const Auth = ({ children }) => {
  const [auth, setAuth] = useState({
    keycloak: null,
    authenticated: false,
    securityProfile: null,
    securityRoles: [],
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
      clientSecret: process.env.REACT_APP_KEYCLOAK_CLIENT_SECRET,
    });

    keycloak
      .init({
        onLoad: "login-required",
        checkLoginIframe: false,
        // redirectUri: window.location.origin,
      })
      .then((authenticated) => {
        const securityRoles = determineAccess(keycloak, setAccess);

        if (authenticated) {
          setInterval(() => {
            keycloak.updateToken(TOKEN_TTL_TIMEOUT_SECONDS).then((refreshed, something) => {
              if (refreshed) {
                console.log('Token refreshed successfully.');
                localStorage.setItem("token", keycloak.token);
                dispatch(StoreProfile({ profile: { token: keycloak.token } }));
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
            securityRoles: securityRoles,
          };
          // profile.logout = keycloak.logout;
          dispatch(StoreProfile({ profile }));
          localStorage.setItem("token", keycloak.token);
          setAuth({
            keycloak,
            authenticated,
            profile,
            securityRoles,
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
  const securityRoles = [];
  const roleSet = new Set(); // Use Set to avoid duplicates

  const subtitlesRoleRex = new RegExp(
    "subtitles_(?<role>.*)|(?<admin_role>admin)"
  );

  // Helper function to extract and add roles
  const extractRoles = (roles) => {
    if (!roles || !Array.isArray(roles)) return;
    
    for (const role of roles) {
      const subtitlesRoleMatchRes = role.match(subtitlesRoleRex);
      
      if (subtitlesRoleMatchRes && subtitlesRoleMatchRes.groups) {
        const securityRole = subtitlesRoleMatchRes.groups.role
          ? subtitlesRoleMatchRes.groups.role
          : subtitlesRoleMatchRes.groups.admin_role;
        
        if (securityRole && !roleSet.has(securityRole)) {
          securityRoles.push(securityRole);
          roleSet.add(securityRole);
          setAccess(true);
        }
      }
    }
  };

  if (!keycloak) {
    return securityRoles;
  }

  // Get client ID from environment variable
  const clientId = process.env.REACT_APP_KEYCLOAK_CLIENT_ID;

  // First, check client roles (resource_access) - preferred method
  if (clientId && keycloak.resourceAccess && keycloak.resourceAccess[clientId]) {
    debugLog("Checking client roles for client:", clientId);
    extractRoles(keycloak.resourceAccess[clientId].roles);
  }

  // Fallback to realm roles for backward compatibility
  if (keycloak.realmAccess && keycloak.realmAccess.roles) {
    debugLog("Checking realm roles (fallback)");
    extractRoles(keycloak.realmAccess.roles);
  }

  debugLog("Extracted security roles:", securityRoles);
  return securityRoles;
}

export default Auth;
