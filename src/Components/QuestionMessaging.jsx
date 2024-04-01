import React, { useState, useContext } from "react";
import AppContext from "../AppContext";
import mqtt from "mqtt";

export function QuestionMessaging({ mqttMessage, setMqttMessage }) {
  // const [isPublished, setIsPublished] = useState(false);
  const [mqttInitilized, setMqttInitilized] = useState(false);
  const [jobMqttMessage, setJobMqttMessage] = useState();
  const [mqttTopic, setMqttTopic] = useState();
  const appContextlData = useContext(AppContext);
  const mqttClient = appContextlData.mqttClient;
  const setMqttClient = appContextlData.setMqttClient;
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const broadcastLangCode = appContextlData.broadcastLang.value;

  let mqttClientId;

  function parseMqttMessage(mqttMessage) {
    if (mqttMessage) {
      try {
        if (typeof mqttMessage === "string") {
          let msgJson = JSON.parse(mqttMessage);

          return msgJson;
        }
      } catch (err) {
        console.log(err);
      }

      return mqttMessage;
    }
  }

  const mqttPublish = (msgText) => {
    if (mqttClient && mqttTopic) {
      mqttClient.publish(
        mqttTopic,
        msgText,
        { label: "0", value: 0, retain: true },
        (error) => {
          if (error) {
            console.log("Publish error:", error);
          } else {
            // setIsPublished(true);
            setJobMqttMessage(msgText);
          }
        }
      );
    } else {
      console.error(
        "Can't publish Active slide, the  mqttClient is not defined"
      );
    }
  };

  function initMqttClient() {
    if (!mqttClient) {
      mqttClientId =
        "kab_subtitles_" + Math.random().toString(16).substring(2, 8);
      const mqttUrl = process.env.REACT_APP_MQTT_URL;
      const mqttProtocol = process.env.REACT_APP_MQTT_PROTOCOL;
      const mqttPort = process.env.REACT_APP_MQTT_PORT;
      const mqttPath = process.env.REACT_APP_MQTT_PATH;

      const mqttOptions = { protocol: mqttProtocol, clientId: mqttClientId };
      const mqttBrokerUrl = `${mqttProtocol}://${mqttUrl}:${mqttPort}/${mqttPath}`;

      const mqttClient = mqtt.connect(mqttBrokerUrl, mqttOptions);
      setMqttClient(mqttClient);
    }

    if (!mqttInitilized) {
      const mqttTopicTmp =
        "questions_" + broadcastProgrammCode + "_" + broadcastLangCode;
      mqttClient.subscribe(mqttTopicTmp);
      subscribeMqttMessage(mqttClient, mqttMessage, setMqttMessage);
      setMqttTopic(mqttTopicTmp);
      setMqttInitilized(true);
    }

    return mqttClient;
  }

  function subscribeMqttMessage(mqttClient, mqttMessage, setMqttMessage) {
    if (mqttClient) {
      mqttClient.on("message", function (topic, message) {
        const messageStr = message.toString();
        const messageJson = parseMqttMessage(messageStr);

        if (
          messageJson &&
          messageJson.context &&
          mqttMessage != messageJson.context
        ) {
          setMqttMessage(messageJson.context);
        }
      });
    }
  }

  const determinePublishQuestion = (
    mqttClient,
    mqttQuestionMessage,
    setMqttQuestionMessage,
    broadcastLangCode
  ) => {
    if (mqttInitilized && mqttQuestionMessage) {
      if (!jobMqttMessage || jobMqttMessage.context != mqttQuestionMessage) {
        const jsonMsg = {
          ID: Math.random().toString(16).substring(2, 8),
          clientId: mqttClientId,
          lang: broadcastLangCode,
          context: mqttQuestionMessage,
        };

        const jsonMsgStr = JSON.stringify(jsonMsg);
        mqttPublish(jsonMsgStr, mqttClient, setMqttQuestionMessage);
      }
    }
  };

  initMqttClient(
    broadcastProgrammCode,
    broadcastLangCode,
    mqttClient,
    setMqttClient,
    mqttMessage,
    setMqttMessage,
    mqttInitilized,
    setMqttInitilized
  );

  determinePublishQuestion(
    mqttClient,
    mqttMessage,
    setMqttMessage,
    broadcastLangCode
  );

  return <div style={{ display: "none" }}></div>;
}

export default QuestionMessaging;
