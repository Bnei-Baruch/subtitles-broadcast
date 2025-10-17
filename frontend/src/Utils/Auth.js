import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import ErrorLogin from "../Pages/Views/ErrorLogin";
import { StoreProfile } from "../Redux/UserProfile/UserProfileSlice";
import PropTypes from "prop-types";
import AuthService from "../Services/AuthService";

const TOKEN_REFRESH_INTERVAL_SECONDS = 30;
const TOKEN_TTL_TIMEOUT_SECONDS = 60;

export const isAdmin = (securityRoles) =>
  securityRoles && securityRoles.includes("admin");

export const isOperator = (securityRoles) =>
  securityRoles && (securityRoles.includes("operator") || securityRoles.includes("admin"));

export const isTranslator = (securityRoles) =>
  securityRoles && (securityRoles.includes("translator") || securityRoles.includes("admin"));

const Auth = ({ children }) => {
  const [auth, setAuth] = useState({
    authenticated: false,
    profile: null,
    securityRoles: [],
  });
  const [access, setAccess] = useState(false);
  const dispatch = useDispatch();
  const [authService] = useState(() => new AuthService());

  useEffect(() => {
    // Check if user is already authenticated
    if (authService.isAuthenticated()) {
      const roles = authService.getRoles();
      const profile = {
        username: "user", // We'll get this from token or user info
        firstName: "User",
        lastName: "Name",
        email: "user@example.com",
        token: authService.getToken(),
        securityRoles: roles,
      };

      setAuth({
        authenticated: true,
        profile,
        securityRoles: roles,
      });
      setAccess(true);

      // Set up token refresh
      const refreshInterval = setInterval(async () => {
        try {
          await authService.refreshAccessToken();
          const newRoles = authService.getRoles();
          const updatedProfile = {
            ...profile,
            token: authService.getToken(),
            securityRoles: newRoles,
          };
          
          dispatch(StoreProfile({ profile: updatedProfile }));
          setAuth({
            authenticated: true,
            profile: updatedProfile,
            securityRoles: newRoles,
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          authService.logout();
          setAuth({
            authenticated: false,
            profile: null,
            securityRoles: [],
          });
          setAccess(false);
        }
      }, TOKEN_REFRESH_INTERVAL_SECONDS * 1000);

      return () => clearInterval(refreshInterval);
    } else {
      // Show login form
      setAuth({
        authenticated: false,
        profile: null,
        securityRoles: [],
      });
      setAccess(false);
    }
  }, [dispatch, authService]);

  const handleLogin = async (username, password) => {
    try {
      const result = await authService.login(username, password);
      
      if (result.authenticated) {
        const roles = authService.getRoles();
        const profile = {
          username: result.user.preferred_username || username,
          firstName: result.user.given_name || "",
          lastName: result.user.family_name || "",
          email: result.user.email || "",
          token: result.token,
          securityRoles: roles,
        };

        dispatch(StoreProfile({ profile }));
        localStorage.setItem("token", result.token);
        
        setAuth({
          authenticated: true,
          profile,
          securityRoles: roles,
        });
        setAccess(true);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  if (auth.authenticated) {
    if (access) {
      return <>{children(auth)}</>;
    } else {
      return <div>User don't have Rights to view this application</div>;
    }
  } else {
    return (
      <>
        <ErrorLogin onLogin={handleLogin} />
      </>
    );
  }
};

Auth.propTypes = {
  children: PropTypes.func.isRequired,
};

export default Auth;