import React, { useState, useContext, useEffect } from "react";
import AppContext from "../AppContext";
import PropTypes from "prop-types";
import mqttClientUtils, { parseMqttMessage } from "../Utils/MqttUtils";
import { broadcastLanguages } from "../Utils/Const";

const QuestionMessage = (props) => {
  const appContextlData = useContext(AppContext);
  const mqttClient = appContextlData.mqttClient;
  const setMqttClient = appContextlData.setMqttClient;
  const setMqttClientId = appContextlData.setMqttClientId;
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const [mqttQuestion, setMqttQuestion] = useState();
  const [mqttDate, setMqttDate] = useState();

  const broadcastLangMapObj = {};
  broadcastLanguages.forEach((broadcastLangObj) => {
    broadcastLangMapObj[broadcastLangObj.value] = broadcastLangObj;
  });

  function initMqttClient() {
    if (!mqttClient) {
      mqttClientUtils(setMqttClient, setMqttClientId);
    }

    return mqttClient;
  }

  function subscribeMqttMessage() {
    if (mqttClient) {
      const mqttTopicTmp = `${props.languageCode}_questions_${broadcastProgrammCode}`;
      mqttClient.subscribe(mqttTopicTmp);

      mqttClient.on("message", function (topic, message) {
        updateMqttQuestion(message, props.languageCode);
      });
    }
  }

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
    }
  };

  useEffect(() => {
    if (mqttClient) {
      console.log(mqttClient);
      subscribeMqttMessage();

      mqttClient.on("connect", () => {
        console.log("MQTT connected");
      });

      mqttClient.on("error", (err) => {
        console.error("MQTT  connection error: ", err);
        mqttClient.end();
      });

      mqttClient.on("reconnect", () => {
        console.log("MQTT  reconnecting");
      });

      mqttClient.on("message", (topic, message) => {
        updateMqttQuestion(message);
      });
    }
  }, [mqttClient]);

  const parseUtcStrToLocal = (utcDateStr) => {
    let retVal = utcDateStr;

    if (utcDateStr) {
      const locDate = new Date(utcDateStr);
      retVal = `Date: ${locDate.toLocaleDateString()}  Time: ${locDate.toLocaleTimeString()}`;
    }

    return retVal;
  };

  initMqttClient();
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
        <div>
          <li class="item">
            <span class="datetime">Date: {parseUtcStrToLocal(mqttDate)}</span>
            <br />
            <div class="message">{mqttQuestion}</div>
          </li>
          <hr />
        </div>
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
