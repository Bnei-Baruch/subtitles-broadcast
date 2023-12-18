import React, { useState, useEffect } from "react";
import Keycloak from "keycloak-js";

import { useDispatch } from "react-redux";

import ErrorLogin from "../Pages/Views/ErrorLogin";
import LoadingScreen from "../Pages/Views/LoadingScreen";
import { StoreProfile } from "../Redux/UserProfile/UserProfileSlice";
import PropTypes from "prop-types";

const Auth = ({ children }) => {
  const [auth, setAuth] = useState({ keycloak: null, authenticated: false });
  const [access, setAccess] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const keycloak = Keycloak({
      realm: "master",
      url: "https://auth.2serv.eu/auth",
      clientId: "kolman-dev",
    });
    keycloak
      .init({
        onLoad: "login-required",
        checkLoginIframe: false,
        // redirectUri: window.location.origin,
      })
      .then((authenticated) => {
        if (keycloak.realmAccess.roles.includes("admin")) {
          setAccess(true);
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
          };
          // profile.logout = keycloak.logout;
          dispatch(StoreProfile({ profile }));
          localStorage.setItem("token", keycloak.token);
          setAuth({
            keycloak,
            authenticated,
            profile,
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
  } else {
    return (
      <div>
        <LoadingScreen />
      </div>
    );
  }
};

Auth.propTypes = {
  children: PropTypes.func.isRequired, // PropTypes validation for children prop
};
export default Auth;
