import React from "react";
import { BrowserRouter } from "react-router-dom";

import SideNavBar from "./Layout/SideNavBar";

import MainRoutes from "./Routes/Routes";

const App = () => (
  <BrowserRouter>
    <>
      <SideNavBar />
      <MainRoutes />
    </>
  </BrowserRouter>
);

export default App;
