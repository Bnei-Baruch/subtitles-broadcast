import React, { useState, useContext } from "react";
import "./PagesCSS/Questions.css";
import AppContext from "../AppContext";
import mqttClientUtils from "../Utils/MqttUtils";
import QuestionMessage from "../Components/QuestionMessage";

const QuestionModule = () => {
  const newQuestionTxtRef = React.createRef();
  const appContextlData = useContext(AppContext);
  const mqttClient = appContextlData.mqttClient;
  const setMqttClient = appContextlData.setMqttClient;
  const mqttClientId = appContextlData.mqttClientId;
  const setMqttClientId = appContextlData.setMqttClientId;
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const broadcastLangCode = appContextlData.broadcastLang.value;
  const [handleSuccess, sethandleSuccess] = useState(false);

  const clearButtonClickHandler = () => {
    sethandleSuccess(false);

    if (newQuestionTxtRef.current) {
      newQuestionTxtRef.current.value = "";
      newQuestionTxtRef.current.focus();
    }
  };

  const sendQuestionButtonClickHandler = () => {
    sethandleSuccess(true);

    if (newQuestionTxtRef.current) {
      const qustionTxt = newQuestionTxtRef.current.value;

      if (qustionTxt) {
        const jsonMsg = {
          ID: Math.random().toString(16).substring(2, 8),
          clientId: mqttClientId,
          lang:
            broadcastLangCode && broadcastLangCode.value
              ? broadcastLangCode.value
              : broadcastLangCode,
          context: qustionTxt,
          date: new Date().toUTCString(),
          visible: true,
        };

        const jsonMsgStr = JSON.stringify(jsonMsg);
        const mqttTopic = `${broadcastLangCode}_questions_${broadcastProgrammCode}`;
        mqttPublish(mqttTopic, jsonMsgStr);
      }
    }
  };

  function initMqttClient() {
    if (!mqttClient) {
      mqttClientUtils(setMqttClient, setMqttClientId);
    }

    return mqttClient;
  }

  const mqttPublish = (mqttTopic, msgText, setMqttMessage) => {
    if (mqttClient && mqttTopic) {
      mqttClient.publish(
        mqttTopic,
        msgText,
        { label: "0", value: 0, retain: true },
        (error) => {
          if (error) {
            console.log("Publish error:", error);
          }
        }
      );
    } else {
      console.error(
        "Can't publish Active slide, the  mqttClient is not defined"
      );
    }
  };

  initMqttClient();

  return (
    <div className="form-Question">
      <p className="QutionTitle">Workshop question</p>
      <div className="d-flex flex-column  h-auto">
        <div className=" d-flex justify-content-end  p-0">
          <button
            className="btn btn-light btn-sm ms-3 my-1"
            onClick={clearButtonClickHandler}
          >
            clear
          </button>
          <button
            className="btn btn-primary btn-sm ms-3 my-1"
            onClick={() => sendQuestionButtonClickHandler()}
          >
            Send question
          </button>
        </div>
        <div className=" SendQutionTextBox">
          {handleSuccess && (
            <span className="SentToast d-flex justify-content-center align-items-center">
              <i className="bi bi-check-circle text-success p-1" />
              <span className="p-1">Successfully sent</span>
              <i
                onClick={() => clearButtonClickHandler()}
                className="bi bi-x p-1 cursor-pointer"
              />
            </span>
          )}
          <textarea
            ref={newQuestionTxtRef}
            class="new-question-txt form-control"
            id="new_question_txt"
            rows="8"
            placeholder="New Question typing"
          ></textarea>
        </div>
      </div>
      <div className="my-5">
        <p>History</p>
        <div class="SendQutionHistory">
          <ul>
            <QuestionMessage languageCode="he"></QuestionMessage>
            <QuestionMessage languageCode="ru"></QuestionMessage>
            <QuestionMessage languageCode="en"></QuestionMessage>
            <QuestionMessage languageCode="es"></QuestionMessage>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionModule;
