import React, { useEffect } from "react";
import { BrowserRouter, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import useMqtt from "./Utils/UseMqttUtils";
import "./App.css";
import SideNavBar from "./Layout/SideNavBar";
import MainRoutes from "./Routes/Routes";
import debugLog from "./Utils/debugLog";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { markErrorAsUiPresented } from "./Redux/MQTT/mqttSlice";

const App = ({ auth }) => {
  const { subscribe, unsubscribe } = useMqtt();
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.mqtt.isConnected);
  const mqttTopics = useSelector((state) => state.mqtt.mqttTopics);
  const mqttErrors = useSelector((state) => state.mqtt.errorLogs);

  useEffect(() => {
    // Log the error if there is one
    mqttErrors.forEach((errorObj) => {
      if (!errorObj.uiPresented) {
        toast.error(errorObj.message, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
        });

        dispatch(markErrorAsUiPresented(errorObj.id));
      }
    });
  }, [mqttErrors, dispatch]);

  useEffect(() => {
    if (isConnected) {
      mqttTopics.forEach((topic) => {
        subscribe(topic);
        debugLog("Subscribed to topic: ", topic);
      });
    }

    return () => {
      mqttTopics.forEach((topic) => {
        unsubscribe(topic);
        debugLog("Unsubscribed from topic: ", topic);
      });
    };
  }, [isConnected, mqttTopics, subscribe, unsubscribe, dispatch]);

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
