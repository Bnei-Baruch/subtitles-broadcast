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
    mqttClientIdUseMqtt,
    mqttClient,
  } = useMqtt();
  const [broadcastProgramm, setBroadcastProgramm] = useState();
  const [broadcastLang, setBroadcastLang] = useState();
  const [mqttClientObj, setMqttClientObj] = useState(mqttClient);
  const [mqttClientId, setMqttClientId] = useState(mqttClientIdUseMqtt);
  const [mqttTopicList, setMqttTopicList] = useState([]);
  const [notificationList, setNotificationList] = useState([]);
  const [init, setInit] = useState(true);

  const mqttUnSubscribeEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;

    setMqttTopicList(mqttTopicList.filter((e) => e !== mqttTopic));

    if (isConnected) {
      mqttUnSubscribe(mqttTopic);
      console.log("App mqttUnSubscribed", data);
    }
  };

  const mqttSubscribeEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;

    if (mqttTopicList.includes(mqttTopic)) {
      console.log("App mqttSubscribe already subscribed", mqttTopic);
    } else {
      mqttTopicList.push(mqttTopic);

      if (isConnected) {
        mqttSubscribe(mqttTopic);
        console.log("App mqttSubscribe DONE", mqttTopic);
      }
    }
  };

  const mqttPublushEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;
    const message = data.detail.message;

    mqttPublush(mqttTopic, message, mqttClientObj).then(() => {
      console.log("App mqttPublushed", data);
    });
  };

  if (init) {
    setInit(false);
    // subscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
    // subscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
    // subscribeEvent("mqttPublush", mqttPublushEventHandler);
  }

  useEffect(() => {
    subscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
    subscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
    subscribeEvent("mqttPublush", mqttPublushEventHandler);

    return () => {
      unsubscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
      unsubscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
      unsubscribeEvent("mqttPublush", mqttUnSubscribeEventHandler);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      mqttTopicList.forEach((mqttTopic, index) => {
        mqttSubscribe(mqttTopic);
        console.log("App useEffect mqttSubscribe DONE", mqttTopic);
      });
    }
  }, [isConnected]);

  useEffect(() => {
    console.log("App payload", payload);
    if (payload.message && mqttTopicList.includes(payload.topic)) {
      const newMessage = JSON.parse(payload.message);
      const notif = [...notificationList, newMessage];
      setNotificationList(notif);

      console.log("App newMessage", newMessage);
    }
  }, [payload]);

  return (
    <BrowserRouter>
      <div className="app">
        <AppContext.Provider
          value={{
            mqttClientId,
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
