import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useMqtt from "./Utils/UseMqttUtils";
import "./App.css";
import SideNavBar from "./Layout/SideNavBar";
import MainRoutes from "./Routes/Routes";
import { markNotificationAsUiPresented } from "./Redux/MQTT/mqttSlice";
import { fetchUserSettings } from "./Redux/UserSettingsSlice";
import { showErrorToast, showSuccessToast } from "./Utils/Common";

const App = ({ auth }) => {
  // Initialize and setup MQTT.
  const { unsubscribe } = useMqtt();

  const dispatch = useDispatch();
  const mqttNotifications = useSelector((state) => state.mqtt.notificationLogs);

  useEffect(() => {
    // Display notifications
    mqttNotifications.forEach((notification) => {
      if (!notification.uiPresented) {
        if (notification.type === "success") {
          showSuccessToast(notification.message);
        } else {
          // Default to error for "error" type and any unknown types
          showErrorToast(notification.message);
        }
        dispatch(markNotificationAsUiPresented(notification.id));
      }
    });
  }, [mqttNotifications, dispatch]);

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
