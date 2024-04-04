import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.css";

import SideNavBar from "./Layout/SideNavBar";

import MainRoutes from "./Routes/Routes";
import HeaderBar from "./Layout/HeaderBar";
import AppContext from "./AppContext";
import useMqtt, { parseMqttMessage } from "./Utils/UseMqttUtils";
import { subscribeEvent, unsubscribeEvent, publishEvent } from "./Utils/Events";

const App = ({ auth }) => {
  const {
    mqttUnSubscribe,
    mqttSubscribe,
    mqttPublush,
    isConnected,
    payload,
    clientId,
  } = useMqtt();
  const [broadcastProgramm, setBroadcastProgramm] = useState();
  const [broadcastLang, setBroadcastLang] = useState();
  const [mqttClient, setMqttClient] = useState();
  const [mqttClientId, setMqttClientId] = useState();
  const [mqttTopicList, setMqttTopicList] = useState([]);
  const [notificationList, setNotificationList] = useState([]);
  const [init, setInit] = useState(true);

  const mqttUnSubscribeEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;

    setMqttTopicList(mqttTopicList.filter((e) => e !== mqttTopic));

    if (isConnected) {
      mqttUnSubscribe(mqttTopic);
    }

    console.log("App mqttUnSubscribe", data);
  };

  const mqttSubscribeEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;
    mqttTopicList.push(mqttTopic);

    if (isConnected) {
      mqttSubscribe(mqttTopic);
      console.log("App mqttSubscribe DONE", mqttTopic);
    }
  };

  const mqttPublushEventHandler = (data) => {
    console.log("App mqttPublush", data);
  };

  if (init) {
    setInit(false);
    subscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
    subscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
    subscribeEvent("mqttPublush", mqttUnSubscribeEventHandler);
  }

  useEffect(() => {
    return () => {
      unsubscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
      unsubscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      mqttTopicList.forEach((mqttTopic, index) => {
        mqttSubscribe(mqttTopic);
        console.log("App mqttSubscribe DONE", mqttTopic);
      });
    }
  }, [isConnected]);

  useEffect(() => {
    console.log("App payload", payload);
    if (payload.message && mqttTopicList.includes(payload.topic)) {
      const newMessage = JSON.parse(payload.message);
      const notif = [...notificationList, newMessage];
      setNotificationList(notif);
      // publishEvent(payload.topic, {
      //   mqttTopic: payload.topic,
      //   clientId: clientId,
      //   messageJson: newMessage,
      // });

      console.log("App newMessage", newMessage);
    }
  }, [payload]);

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
