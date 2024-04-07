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
  const [subscribeCandidateList, setSubscribeCandidateList] = useState([]);

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
    let isIncludes = false;

    let msgListStorageArrJsonStr = sessionStorage.getItem(
      "AppNotificationList"
    );
    let msgListStorageJson = JSON.parse(msgListStorageArrJsonStr);

    if (!msgListStorageJson) {
      msgListStorageJson = notificationList;
    }

    notificationList.forEach((message, index) => {
      if (message.topic === mqttTopic) {
        publishEvent(mqttTopic, message);

        console.log(
          "App mqttSubscribe already subscribed, raised custome event",
          message
        );
      }
    });

    if (!isIncludes) {
      mqttTopicList.push(mqttTopic);

      if (isConnected) {
        mqttSubscribe(mqttTopic);
        subscribeCandidate(mqttTopic);
        console.log("App mqttSubscribe DONE", mqttTopic);
      } else {
        const notif = [...subscribeCandidateList, mqttTopic];
        setSubscribeCandidateList(notif);
        console.log("App mqttSubscribe Candidate", mqttTopic);
      }
    }
  };

  const subscribeCandidate = (mqttTopic) => {
    if (subscribeCandidateList.length > 0) {
      subscribeCandidateList.forEach((topic, index) => {
        if (topic !== mqttTopic) {
          console.log("App mqttSubscribe Candidate DONE", mqttTopic);
          mqttTopicList.push(mqttTopic);
          mqttSubscribe(topic);
          setSubscribeCandidateList([]);
        }
      });
    }
  };

  const mqttPublushEventHandler = (data) => {
    const mqttTopic = data.detail.mqttTopic;
    const message = data.detail.message;

    mqttPublush(mqttTopic, message, mqttClientObj).then(() => {
      console.log("App mqttPublushed", data);
    });
  };

  let subscribed = false;

  const subscribeAppEvents = () => {
    //TODO: Find proper solution to subscribe only once
    if (!subscribed) {
      subscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
      subscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
      subscribeEvent("mqttPublush", mqttPublushEventHandler);
    }
    subscribed = true;
  };
  const unSubscribeAppEvents = () => {
    unsubscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
    unsubscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
    unsubscribeEvent("mqttPublush", mqttUnSubscribeEventHandler);
  };

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
        console.log("App useEffect mqttSubscribe DONE", mqttTopic);
      });
    }

    return () => {
      unSubscribeAppEvents();
    };
  }, [isConnected]);

  useEffect(() => {
    if (payload.message && mqttTopicList.includes(payload.topic)) {
      let msgListStorageArrJsonStr = sessionStorage.getItem(
        "AppNotificationList"
      );
      let msgListStorageArrJson = JSON.parse(msgListStorageArrJsonStr);

      if (!Array.isArray(msgListStorageArrJson)) {
        msgListStorageArrJson = notificationList;
      }

      const newMessage = JSON.parse(payload.message);
      const newNotif = { topic: payload.topic, message: newMessage };
      const notif = [...msgListStorageArrJson, newNotif];
      setNotificationList(notif);
      console.log("App payload New Message", newNotif);

      msgListStorageArrJsonStr = JSON.stringify(notif);
      sessionStorage.setItem("AppNotificationList", msgListStorageArrJsonStr);
      sessionStorage.setItem(
        `lastMqttMessage_${payload.topic}`,
        payload.message
      );
    }

    return () => {
      unSubscribeAppEvents();
    };
  }, [payload]);

  // subscribeAppEvents();

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
