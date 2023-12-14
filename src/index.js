import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";

import Auth from "./Utils/Auth";
import { store } from "./Redux/Store";
import { Provider } from "react-redux";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ToastContainer } from "react-toastify";
import axios from "axios";

axios.interceptors.request.use(function (config) {
  // Modify the request config to add headers, if needed
  config.headers["Authorization"] = "Bearer " + localStorage.getItem("token");
  return config;
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <Auth>
      <ToastContainer autoClose={2000} />
      <App />
    </Auth>
  </Provider>
);
