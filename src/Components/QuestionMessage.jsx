import React, { useState, useContext } from "react";
import AppContext from "../AppContext";
import mqttClientUtils, { parseMqttMessage } from "../Utils/MqttUtils";

const QuestionMessage = (props) => {
  const appContextlData = useContext(AppContext);
  const mqttClient = appContextlData.mqttClient;
  const setMqttClient = appContextlData.setMqttClient;
  const setMqttClientId = appContextlData.setMqttClientId;
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const [mqttInitilized, setMqttInitilized] = useState(false);
  const [mqttQuestionEn, setMqttQuestionEn] = useState();

  function initMqttClient() {
    if (!mqttClient) {
      mqttClientUtils(setMqttClient, setMqttClientId);
    }

    return mqttClient;
  }

  function subscribeMqttMessage(languageCode) {
    if (mqttClient && !mqttInitilized) {
      let mqttTopicTmp =
        "questions_" + broadcastProgrammCode + "_" + languageCode;
      mqttClient.subscribe(mqttTopicTmp);

      mqttClient.on("message", function (topic, message) {
        updateMqttQuestion(message);
      });

      setMqttInitilized(true);
    }
  }

  const updateMqttQuestion = (message) => {
    const messageStr = message.toString();
    const jobMessageJson = parseMqttMessage(messageStr);

    if (jobMessageJson && jobMessageJson.lang) {
      setMqttQuestionEn(jobMessageJson.context);
    }
  };

  initMqttClient();
  subscribeMqttMessage(props.languageCode);

  return (
    <>
      {mqttQuestionEn && (
        <div>
          <li class="item">
            <span class="datetime">Date: 2024-03-31 Time: 11:08 AM</span>
            <br />
            <div class="message">{mqttQuestionEn}</div>
          </li>
          <hr />
        </div>
      )}
    </>
  );
};

export default QuestionMessage;
