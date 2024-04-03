import React, { useState, useContext, useEffect } from "react";
import AppContext from "../AppContext";
import PropTypes from "prop-types";
// import mqttClientUtils, { parseMqttMessage } from "../Utils/MqttUtils";
import useMqtt, { parseMqttMessage } from "../Utils/UseMqttUtils";
import { broadcastLanguages } from "../Utils/Const";


const QuestionMessage = (props) => {
  const appContextlData = useContext(AppContext);
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const broadcastLangCode = appContextlData.broadcastLang.value;
  const {
    mqttUnSubscribe,
    mqttSubscribe,
    mqttPublush,
    isConnected,
    payload,
    clientId,
  } = useMqtt();
  const [notificationList, setNotificationList] = useState([]);
  const mqttTopicList = broadcastLanguages.map((langItem, index) => {
    const mqttTopic = `subtitles_${broadcastProgrammCode}_${langItem.value}`;
    return mqttTopic;
  })

  useEffect(() => {
    // Notification.requestPermission();

    return () => {
      mqttUnSubscribe(mqttTopic);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      mqttTopicList.forEach((mqttTopic, index) => {
        mqttSubscribe(mqttTopic);
      })
    }
  }, [isConnected]);

  useEffect(() => {
    if (payload.message && mqttTopicList.includes(payload.topic)) {
      const newMessage = JSON.parse(payload.message);
      const notif = [newMessage];
      setNotificationList(notif);
      // new Notification(newMessage.slide);

      if (newMessage && newMessage.clientId !== clientId) {
        setJobMqttMessage(newMessage);
      }
    }
  }, [payload]);

  // const mqttClient = appContextlData.mqttClient;
  // const setMqttClient = appContextlData.setMqttClient;
  // const setMqttClientId = appContextlData.setMqttClientId;
  const [mqttQuestion, setMqttQuestion] = useState();
  const [mqttDate, setMqttDate] = useState();

  const broadcastLangMapObj = {};
  broadcastLanguages.forEach((broadcastLangObj) => {
    broadcastLangMapObj[broadcastLangObj.value] = broadcastLangObj;
  });

  // function initMqttClient() {
  //   if (!mqttClient) {
  //     mqttClientUtils(setMqttClient, setMqttClientId);
  //   }

  //   return mqttClient;
  // }

  // function subscribeMqttMessage() {
  //   if (mqttClient) {
  //     const mqttTopicTmp = `${props.languageCode}_questions_${broadcastProgrammCode}`;
  //     mqttClient.subscribe(mqttTopicTmp);

  //     mqttClient.on("message", function (topic, message) {
  //       updateMqttQuestion(message, props.languageCode);
  //     });
  //   }
  // }

  const updateMqttQuestion = (message) => {
    const messageStr = message.toString();
    const jobMessageJson = parseMqttMessage(messageStr);

    if (
      jobMessageJson &&
      jobMessageJson.lang &&
      jobMessageJson.lang === props.languageCode
    ) {
      setMqttQuestion(jobMessageJson.context);
      setMqttDate(jobMessageJson.date);
      localStorage.setItem(
        `nqttQuestion${props.languageCode}`,
        jobMessageJson.context
      );
    }
  };

  const parseUtcStrToLocal = (utcDateStr) => {
    let retVal = utcDateStr;

    if (utcDateStr) {
      const locDate = new Date(utcDateStr);
      retVal = `Date: ${locDate.toLocaleDateString()}  Time: ${locDate.toLocaleTimeString()}`;
    }

    return retVal;
  };

  i//nitMqttClient();
  if (mqttQuestion) {
    if (props.mode === "subtitle") {
      const langName = broadcastLangMapObj[props.languageCode].label;

      return (
        <div className="QuestionSection ">
          <div className="d-flex justify-content-between h-auto">
            <p>{langName}</p>
            <i className="bi bi-eye" />
          </div>
          <div className="d-flex justify-content-end">
            <p>{mqttQuestion}</p>
          </div>
        </div>
      );
    } else {
      return (
        <>
          {notificationList.map((obj) => (
            <div>
              <div>
                <li class="item">
                  <span class="datetime">Date: {parseUtcStrToLocal(mqttDate)}</span>
                  <br />
                  <div class="message">{mqttQuestion}</div>
                </li>
                <hr />
              </div>
            </div>
          ))}
        </>
      );
    }
  } else {
    return <></>;
  }
};

QuestionMessage.propTypes = {
  languageCode: PropTypes.string.isRequired,
};

export default QuestionMessage;
