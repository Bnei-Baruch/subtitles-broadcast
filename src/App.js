import React from "react";
import { BrowserRouter } from "react-router-dom";

import SideNavBar from "./Layout/SideNavBar";

import MainRoutes from "./Routes/Routes";

const App = ({ auth }) => (
  <BrowserRouter>
    <>
      {console.log(auth?.keycloak, ">>>>>>>>>")}
      <SideNavBar />
      <MainRoutes logout={auth?.keycloak} />
    </>
  </BrowserRouter>
);

export default App;
