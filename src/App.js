import React, { useState, useEffect } from "react";
import { BrowserRouter, Navigate } from "react-router-dom";
import "./App.css";

import SideNavBar from "./Layout/SideNavBar";

import MainRoutes from "./Routes/Routes";
import useMqtt from "./Utils/UseMqttUtils";
import { publishEvent, subscribeEvent, unSubscribeEvent } from "./Utils/Events";
import AppContext from "./AppContext";

const App = ({ auth }) => {
  const { mqttUnSubscribe, mqttSubscribe, mqttPublush, isConnected, payload } =
    useMqtt();
  const [mqttTopicList, setMqttTopicList] = useState([]);
  const [notificationList, setNotificationList] = useState([]);
  const [subscribeCandidateList, setSubscribeCandidateList] = useState([]);

  const mqttUnSubscribeEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;

    setMqttTopicList(mqttTopicList.filter((e) => e !== mqttTopic));

    if (isConnected) {
      mqttUnSubscribe(mqttTopic);
      // console.log("App mqttUnSubscribed", data);
    }
  };

  const mqttSubscribeEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;
    let isIncludes = false;
    let locNotificationList = [];

    let msgListStorageArrJsonStr = sessionStorage.getItem(
      "AppNotificationList"
    );
    let msgListStorageJson = JSON.parse(msgListStorageArrJsonStr);

    if (msgListStorageJson) {
      locNotificationList = msgListStorageJson;
    }

    locNotificationList.forEach((message, index) => {
      if (message.topic === mqttTopic) {
        publishEvent(mqttTopic, message);

        // console.log("App mqttSubscribe already subscribed, raised custome event", message);
      }
    });

    if (!isIncludes) {
      if (!mqttTopicList.includes(mqttTopic)) {
        mqttTopicList.push(mqttTopic);
      }

      if (isConnected) {
        mqttSubscribe(mqttTopic);
        subscribeCandidate(mqttTopic);
        // console.log("App mqttSubscribe DONE", mqttTopic);
      } else {
        const notif = [...subscribeCandidateList, mqttTopic];
        setSubscribeCandidateList(notif);
        // console.log("App mqttSubscribe Candidate", mqttTopic);
      }
    }
  };

  const subscribeCandidate = (mqttTopic) => {
    if (subscribeCandidateList.length > 0) {
      subscribeCandidateList.forEach((topic, index) => {
        if (topic !== mqttTopic) {
          // console.log("App mqttSubscribe Candidate DONE", mqttTopic);

          if (!mqttTopicList.includes(mqttTopic)) {
            mqttTopicList.push(mqttTopic);
          }

          mqttSubscribe(topic);
          setSubscribeCandidateList([]);
        }
      });
    }
  };

  const mqttPublushEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;
    const message = data.detail.message;
    const sesStorageName = `LastMqttMsg-${mqttTopic}`;
    const lastMqttMessageStr = sessionStorage.getItem(sesStorageName);

    if (!lastMqttMessageStr || lastMqttMessageStr !== message) {
      sessionStorage.setItem(sesStorageName, message);
      mqttPublush(mqttTopic, message).then(() => {
        // console.log("App mqttPublushed", data);
      });
    }
  };

  const mqttNewmessageEventHandler = (data) => {
    let locNotificationList = [];
    const mqttTopic = data.detail.mqttTopic;
    const newMessage = data.detail.messageJson;

    let msgListStorageArrJsonStr = sessionStorage.getItem(
      "AppNotificationList"
    );

    let msgListStorageJson = JSON.parse(msgListStorageArrJsonStr);
    if (msgListStorageJson) {
      locNotificationList = msgListStorageJson;
    }

    const newNotif = { topic: mqttTopic, message: newMessage };
    const notif = [...locNotificationList, newNotif];
    setNotificationList(notif);
    const newNotifStr = JSON.stringify(notif);
    sessionStorage.setItem("AppNotificationList", newNotifStr);
    // console.log("App payload New Message", newNotif);
  };

  let subscribed = false;

  const subscribeAppEvents = () => {
    if (!subscribed) {
      subscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
      subscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
      subscribeEvent("mqttPublush", mqttPublushEventHandler);
      subscribeEvent("mqttNewmessage", mqttNewmessageEventHandler);
    }
    subscribed = true;
  };
  const unSubscribeAppEvents = () => {
    unSubscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
    unSubscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
    unSubscribeEvent("mqttPublush", mqttUnSubscribeEventHandler);
    unSubscribeEvent("mqttNewmessage", mqttNewmessageEventHandler);
  };

  const [broadcastLang, setBroadcastLang] = useState();
  const [broadcastProgramm, setBroadcastProgramm] = useState();

  useEffect(() => {
    subscribeAppEvents();

    return () => {
      unSubscribeAppEvents();
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribeAppEvents();
      mqttTopicList.forEach((mqttTopic, index) => {
        mqttSubscribe(mqttTopic);
        // console.log("App useEffect mqttSubscribe DONE", mqttTopic);
      });
    }

    return () => {
      unSubscribeAppEvents();
    };
  }, [isConnected]);

  useEffect(() => {
    return () => {
      unSubscribeAppEvents();
    };
  }, [payload]);

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <div className="app">
        <AppContext.Provider
          value={{
            broadcastLang,
            setBroadcastLang,
            broadcastProgramm,
            setBroadcastProgramm,
          }}
        >
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
        </AppContext.Provider>
      </div>

      {auth && auth.securityRole && auth.securityRole === "translator" && (
        <Navigate to="/question" />
      )}
    </BrowserRouter>
  );
};

export default App;
