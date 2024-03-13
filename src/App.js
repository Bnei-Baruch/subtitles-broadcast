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

  return (
    <BrowserRouter>
      <div className="app">
        <AppContext.Provider
          value={{
            broadcastProgramm,
            setBroadcastProgramm,
            broadcastLang,
            setBroadcastLang,
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
