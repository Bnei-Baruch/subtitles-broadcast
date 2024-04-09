import React, { useState } from "react";
import "./PagesCSS/Questions.css";
import QuestionMessage from "../Components/QuestionMessage";
import {
  broadcastLanguages,
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
} from "../Utils/Const";
import { publishEvent } from "../Utils/Events";

const QuestionModule = () => {
  const mqttClientId = localStorage.getItem("mqttClientId");

  const newQuestionTxtRef = React.createRef();
  const [handleSuccess, sethandleSuccess] = useState(false);

  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const [broadcastLangObj, setBroadcastLangObj] = useState(() => {
    return getCurrentBroadcastLanguage();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;

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
          type: "question",
          ID: Math.random().toString(16).substring(2, 8),
          clientId: mqttClientId,
          lang:
            broadcastLangCode && broadcastLangCode.value
              ? broadcastLangCode.value
              : broadcastLangCode,
          slide: qustionTxt,
          date: new Date().toUTCString(),
          visible: true,
        };

        const jsonMsgStr = JSON.stringify(jsonMsg);
        const mqttTopic = `${broadcastLangCode}_questions_${broadcastProgrammCode}`;

        console.log("QuestionModule publishEvent mqttPublush", mqttTopic);

        publishEvent("mqttPublush", {
          mqttTopic: mqttTopic,
          message: jsonMsgStr,
        });
      }
    }
  };

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
            className="new-question-txt form-control"
            id="new_question_txt"
            rows="8"
            placeholder="New Question typing"
          ></textarea>
        </div>
      </div>
      <div className="my-5">
        <p>History</p>
        <div className="SendQutionHistory">
          <ul>
            <QuestionMessage
              languagesList={broadcastLanguages}
            ></QuestionMessage>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionModule;
