import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import UserService from "./Services/KeycloakServices";
import Auth from "./Utils/Auth";
import { store } from "./Redux/Store";
import { Provider } from "react-redux";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ToastContainer } from "react-toastify";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <Auth>
      <ToastContainer autoClose={2000}/>
      <App />
    </Auth>
  </Provider>
);
