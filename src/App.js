import React, { useEffect } from "react";
import { BrowserRouter, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import useMqtt from "./Utils/UseMqttUtils";
import "./App.css";
import SideNavBar from "./Layout/SideNavBar";
import MainRoutes from "./Routes/Routes";
import debugLog from "./Utils/debugLog";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { markErrorAsUiPresented } from "./Redux/MQTT/mqttSlice";
import { fetchUserSettings } from "./Redux/UserSettings/UserSettingsSlice";
import { showErrorToast } from "./Utils/Common";

const App = ({ auth }) => {
  const { subscribe, unsubscribe } = useMqtt();
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.mqtt.isConnected);
  const mqttTopics = useSelector((state) => state.mqtt.mqttTopics);
  const mqttErrors = useSelector((state) => state.mqtt.errorLogs);
  const userSettingsLoaded = useSelector(
    (state) => state.userSettings.isLoaded
  );

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
    if (isConnected && userSettingsLoaded) {
      Object.keys(mqttTopics).forEach((topic) => {
        subscribe(topic);
      });
    }

    return () => {
      if (isConnected) {
        Object.keys(mqttTopics).forEach((topic) => {
          unsubscribe(topic);
          debugLog("Unsubscribed from topic: ", topic);
        });
      }
    };
  }, [isConnected, userSettingsLoaded]);

  useEffect(() => {
    dispatch(fetchUserSettings());
  }, [dispatch]);

  return (
    <div>
      <ToastContainer />
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <div className="app">
          <SideNavBar
            securityRole={auth ? auth.securityRole : null}
            authKeycloak={auth?.keycloak}
          />
          <div style={{ backgroundColor: "#eeee" }} className="main-content">
            <MainRoutes
              logout={auth?.keycloak}
              securityRole={auth ? auth.securityRole : null}
            />
          </div>
        </div>

        {auth && auth.securityRole && auth.securityRole === "translator" && (
          <Navigate to="/question" />
        )}
      </BrowserRouter>
    </div>
  );
};

export default App;
