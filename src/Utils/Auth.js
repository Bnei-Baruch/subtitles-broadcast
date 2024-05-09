import React, { useState, useEffect, useContext } from "react";
import Keycloak from "keycloak-js";

import { useDispatch } from "react-redux";

import ErrorLogin from "../Pages/Views/ErrorLogin";
import LoadingScreen from "../Pages/Views/LoadingScreen";
import { StoreProfile } from "../Redux/UserProfile/UserProfileSlice";
import PropTypes from "prop-types";

const Auth = ({ children }) => {
  const [auth, setAuth] = useState({ keycloak: null, authenticated: false, securityProfile: null, securityRole: null });
  const [access, setAccess] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const keycloak = new Keycloak({
      realm: process.env.REACT_APP_KEYCLOAK_REALM,
      url: process.env.REACT_APP_KEYCLOAK_URL,
      clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
    });
    keycloak
      .init({
        onLoad: "login-required",
        checkLoginIframe: false,
        // redirectUri: window.location.origin,
      })
      .then((authenticated) => {
        const securityRole = determineAccess(keycloak, setAccess);

        keycloak.loadUserProfile().then(function () {
          const profile = {
            username: keycloak.profile.username,
            firstName: keycloak.profile.firstName,
            lastName: keycloak.profile.lastName,
            email: keycloak.profile.email,
            token: keycloak.token,

            // TODO: Add gender to the response
            gender: "male",
            securityRole: securityRole
          };
          // profile.logout = keycloak.logout;
          dispatch(StoreProfile({ profile }));
          localStorage.setItem("token", keycloak.token);
          setAuth({
            keycloak,
            authenticated,
            profile,
            securityRole
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
        securityRole = subtitlesRoleMatchRes.groups.role?  
          subtitlesRoleMatchRes.groups.role: 
          subtitlesRoleMatchRes.groups.admin_role;
          securityRole = "translator";  //for testing
        setAccess(true);
        break;
      }
    }
  }

  return securityRole;
}

export default Auth;
