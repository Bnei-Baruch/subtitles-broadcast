import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.css";

import SideNavBar from "./Layout/SideNavBar";

import MainRoutes from "./Routes/Routes";
import HeaderBar from "./Layout/HeaderBar";

const App = ({ auth }) => (
  <BrowserRouter>
    <div className="app">
      <SideNavBar />
      <div style={{ backgroundColor: "#eeee" }} className="main-content">
        <HeaderBar logout={auth?.keycloak} />
        <MainRoutes logout={auth?.keycloak} />
      </div>
    </div>
  </BrowserRouter>
);

export default App;
