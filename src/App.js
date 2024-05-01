import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.css";

import SideNavBar from "./Layout/SideNavBar";

import MainRoutes from "./Routes/Routes";
import HeaderBar from "./Layout/HeaderBar";
import useMqtt from "./Utils/UseMqttUtils";
import { publishEvent, subscribeEvent, unSubscribeEvent } from "./Utils/Events";

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

    mqttPublush(mqttTopic, message).then(() => {
      console.log("App mqttPublushed", data);
    });
  };

  let subscribed = false;

  const subscribeAppEvents = () => {
    if (!subscribed) {
      subscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
      subscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
      subscribeEvent("mqttPublush", mqttPublushEventHandler);
    }
    subscribed = true;
  };
  const unSubscribeAppEvents = () => {
    unSubscribeEvent("mqttSubscribe", mqttSubscribeEventHandler);
    unSubscribeEvent("mqttUnSubscribe", mqttUnSubscribeEventHandler);
    unSubscribeEvent("mqttPublush", mqttUnSubscribeEventHandler);
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
      const newMessage = JSON.parse(payload.message);
      const newNotif = { topic: payload.topic, message: newMessage };
      const notif = [...notificationList, newNotif];
      setNotificationList(notif);
      console.log("App payload New Message", newNotif);
    }

    return () => {
      unSubscribeAppEvents();
    };
  }, [payload]);

  return (
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
};

export default App;
