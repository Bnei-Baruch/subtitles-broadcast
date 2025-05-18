import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useMqtt from "./Utils/UseMqttUtils";
import "./App.css";
import SideNavBar from "./Layout/SideNavBar";
import MainRoutes from "./Routes/Routes";
import { markErrorAsUiPresented } from "./Redux/MQTT/mqttSlice";
import { fetchUserSettings } from "./Redux/UserSettings/UserSettingsSlice";
import { showErrorToast } from "./Utils/Common";

const App = ({ auth }) => {
  // Initialize and setup MQTT.
  const { unsubscribe } = useMqtt();

  const dispatch = useDispatch();
  const mqttErrors = useSelector((state) => state.mqtt.errorLogs);

  useEffect(() => {
    // Log the error if there is one
    mqttErrors.forEach((errorObj) => {
      if (!errorObj.uiPresented) {
        showErrorToast(errorObj.message);
        dispatch(markErrorAsUiPresented(errorObj.id));
      }
    });
  }, [mqttErrors, dispatch]);

  useEffect(() => {
    dispatch(fetchUserSettings());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      unsubscribe();
    }
  }, []);

  return (
    <div>
      <ToastContainer />
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <div className="app">
          <SideNavBar
            securityRoles={auth ? auth.securityRoles : null}
            authKeycloak={auth?.keycloak}
          />
          <div style={{ backgroundColor: "#eeee" }} className="main-content">
            <MainRoutes
              logout={auth?.keycloak}
              securityRoles={auth ? auth.securityRoles : null}
            />
          </div>
        </div>
      </BrowserRouter>
    </div>
  );
};

export default App;
