import React, { useState, useContext, useEffect } from "react";
import "./PagesCSS/Questions.css";
import AppContext from "../AppContext";
import mqttClientUtils, { parseMqttMessage } from "../Utils/MqttUtils";
// import QuestionMessage from "../Components/QuestionMessage";

const QuestionModule = () => {
  const newQuestionTxtRef = React.createRef();
  const appContextlData = useContext(AppContext);
  const mqttClient = appContextlData.mqttClient;
  const setMqttClient = appContextlData.setMqttClient;
  const mqttClientId = appContextlData.mqttClientId;
  const setMqttClientId = appContextlData.setMqttClientId;
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const broadcastLangCode = appContextlData.broadcastLang;
  const [mqttInitilized, setMqttInitilized] = useState(false);
  const [handleSuccess, sethandleSuccess] = useState(false);
  const [mqttTopic, setMqttTopic] = useState();
  const [mqttQuestionEn, setMqttQuestionEn] = useState();
  const [mqttQuestionHe, setMqttQuestionHe] = useState();
  const [mqttQuestionRu, setMqttQuestionRu] = useState();
  const [mqttQuestionEs, setMqttQuestionEs] = useState();

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
        };

        const jsonMsgStr = JSON.stringify(jsonMsg);
        const mqttTopic = jsonMsg.lang + "_questions_" + broadcastProgrammCode;
        mqttPublish(mqttTopic, jsonMsgStr, setMqttQuestionEn);
      }
    }
  };

  function initMqttClient() {
    if (!mqttClient) {
      mqttClientUtils(setMqttClient, setMqttClientId);
    }

    return mqttClient;
  }

  function subscribeMqttMessage() {
    // if (mqttClient && !mqttInitilized) {
    if (mqttClient) {
      const mqttTopicTmpHe = "he_questions_" + broadcastProgrammCode;
      const mqttTopicTmpEn = "en_questions_" + broadcastProgrammCode;
      const mqttTopicTmpRu = "ru_questions_" + broadcastProgrammCode;
      const mqttTopicTmpEs = "es_questions_" + broadcastProgrammCode;

      mqttClient.subscribe(mqttTopicTmpHe);
      mqttClient.subscribe(mqttTopicTmpEn);
      mqttClient.subscribe(mqttTopicTmpRu);
      mqttClient.subscribe(mqttTopicTmpEs);

      // mqttClient.on("message", function (topic, message) {
      //   updateMqttQuestion(message);
      // });

      setMqttInitilized(true);
    }
  }

  const updateMqttQuestion = (message) => {
    const messageStr = message.toString();
    const jobMessageJson = parseMqttMessage(messageStr);

    if (jobMessageJson && jobMessageJson.lang) {
      switch (jobMessageJson.lang) {
        case "en":
          setMqttQuestionEn(jobMessageJson.context);
          break;
        case "he":
          setMqttQuestionHe(jobMessageJson.context);
          break;
        case "ru":
          setMqttQuestionRu(jobMessageJson.context);
          break;
        case "es":
          setMqttQuestionEs(jobMessageJson.context);
          break;
        default:
          break;
      }
    }
  };

  const mqttPublish = (mqttTopic, msgText, setMqttMessage) => {
    if (mqttClient && mqttTopic) {
      mqttClient.publish(
        mqttTopic,
        msgText,
        { label: "0", value: 0, retain: true },
        (error) => {
          if (error) {
            console.log("Publish error:", error);
          } else {
            setMqttMessage(msgText);
          }
        }
      );
    } else {
      console.error(
        "Can't publish Active slide, the  mqttClient is not defined"
      );
    }
  };

  useEffect(() => {
    if (mqttClient) {
      console.log(mqttClient);

      subscribeMqttMessage();

      mqttClient.on("connect", () => {
        console.log("Connected");
      });

      mqttClient.on("error", (err) => {
        console.error("Connection error: ", err);
        mqttClient.end();
      });

      mqttClient.on("reconnect", () => {
        console.log("Reconnecting");
      });

      mqttClient.on("message", (topic, message) => {
        updateMqttQuestion(message);
      });
    }
  }, [mqttClient]);

  initMqttClient();
  //subscribeMqttMessage();

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
            <li class="item">
              <span class="datetime">Date: 2024-03-21 Time: 10:30 AM</span>
              <br />
              <span class="message">This is the message for Item 1.</span>
            </li>
            <hr />
            <li class="item">
              <span class="datetime">Date: 2024-03-22 Time: 11:45 AM</span>
              <br />
              <span class="message">This is the message for Item 2.</span>
            </li>
            <hr />
            {/* <li class="item">
              <span class="datetime">Date: 2024-03-30 Time: 10:00 AM</span>
              <br />
              <div class="message">{mqttQuestionHe}</div>
            </li>
            <hr /> */}
            {/* <QuestionMessage languageCode="he"></QuestionMessage>
            <QuestionMessage languageCode="en"></QuestionMessage>
            <QuestionMessage languageCode="ru"></QuestionMessage>
            <QuestionMessage languageCode="es"></QuestionMessage> */}
            {mqttQuestionHe && (
              <div>
                <li class="item">
                  <span class="datetime">Date: 2024-03-30 Time: 10:00 AM</span>
                  <br />
                  <div class="message">{mqttQuestionHe}</div>
                </li>
                <hr />
              </div>
            )}
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
            {mqttQuestionRu && (
              <div>
                <li class="item">
                  <span class="datetime">Date: 2024-03-23 Time: 03:08 AM</span>
                  <br />
                  <div class="message">{mqttQuestionRu}</div>
                </li>
                <hr />
              </div>
            )}
            {mqttQuestionEs && (
              <div>
                <li class="item">
                  <span class="datetime">Date: 2024-03-20 Time: 01:08 AM</span>
                  <br />
                  <div class="message">{mqttQuestionEs}</div>
                </li>
                <hr />
              </div>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionModule;
