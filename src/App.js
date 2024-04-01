import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.css";

import SideNavBar from "./Layout/SideNavBar";

import MainRoutes from "./Routes/Routes";
import HeaderBar from "./Layout/HeaderBar";
import AppContext from "./AppContext";

const App = ({ auth }) => {
  const [broadcastProgramm, setBroadcastProgramm] = useState();
  const [broadcastLang, setBroadcastLang] = useState();
  const [mqttClient, setMqttClient] = useState();
  const [mqttClientId, setMqttClientId] = useState();
  // const mqttClientObj = {
  //   mqttClient: mqttClient,
  //   setMqttClient: setMqttClient,
  // };

  return (
    <BrowserRouter>
      <div className="app">
        <AppContext.Provider
          value={{
            broadcastProgramm,
            setBroadcastProgramm,
            broadcastLang,
            setBroadcastLang,
            mqttClient,
            setMqttClient,
            mqttClientId,
            setMqttClientId,
          }}
        >
          <SideNavBar />
          <div style={{ backgroundColor: "#eeee" }} className="main-content">
            <HeaderBar logout={auth?.keycloak} />
            <MainRoutes logout={auth?.keycloak} />
          </div>
        </AppContext.Provider>
      </div>
    </BrowserRouter>
  );
};

export default App;
