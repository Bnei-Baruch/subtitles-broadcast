import React, { useEffect } from "react";
import { BrowserRouter, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import useMqtt from "./Utils/UseMqttUtils";
import "./App.css";
import SideNavBar from "./Layout/SideNavBar";
import MainRoutes from "./Routes/Routes";

const App = ({ auth }) => {
  const { subscribe, unsubscribe } = useMqtt();
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.mqtt.isConnected);
  const mqttTopics = useSelector((state) => state.mqtt.mqttTopics);

  useEffect(() => {
    if (isConnected) {
      console.log("✅ MQTT Connected, subscribing to topics...");
      mqttTopics.forEach((topic) => subscribe(topic));
    }

    return () => {
      console.log("❌ Unsubscribing from topics...");
      mqttTopics.forEach((topic) => unsubscribe(topic));
    };
  }, [isConnected, mqttTopics, subscribe, unsubscribe, dispatch]);

  return (
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
  );
};

export default App;
