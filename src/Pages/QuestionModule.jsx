import React, { useState, useEffect, useRef } from "react";
import "./PagesCSS/Questions.css";
import QuestionMessage from "../Components/QuestionMessage";
import { broadcastLanguages } from "../Utils/Const";
import { getQuestionMqttTopic, languageIsLtr } from "../Utils/Common";
import { publishEvent } from "../Utils/Events";
import { useSelector } from "react-redux";
import { getSubtitleMqttTopic } from "../Utils/Common";

const QuestionModule = () => {
  const [questionText, setQuestionText] = useState("");
  const [handleSuccess, setHandleSuccess] = useState(false);
  const textAreaRef = useRef(null);
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he",
  );
  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson",
  );
  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode,
  );
  const [isLtr, setIsLtr] = useState(languageIsLtr(broadcastLangCode));

  useEffect(() => {
    setIsLtr(languageIsLtr(broadcastLangCode));
  }, [broadcastLangCode]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.select();
    }
  }, []);

  const clearButtonClickHandler = () => {
    setQuestionText("");
    setHandleSuccess(false);
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };

  const sendQuestionButtonClickHandler = () => {
    if (!questionText.trim()) return;

    const jsonMsg = {
      type: "question",
      ID: Math.random().toString(16).substring(2, 8),
      lang: broadcastLangCode,
      slide: questionText,
      visible: true,
      isLtr: isLtr,
      display_status: subtitlesDisplayMode,
    };

    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      broadcastLangCode,
    );
    publishEvent("mqttPublush", {
      mqttTopic,
      message: jsonMsg,
    });

    if (subtitlesDisplayMode === "questions") {
      const subtitleMqttTopic = getSubtitleMqttTopic(
        broadcastProgrammCode,
        broadcastLangCode,
      );

      publishEvent("mqttPublush", {
        mqttTopic: subtitleMqttTopic,
        message: jsonMsg,
      });
    }

    setHandleSuccess(true);
    setQuestionText("");
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };

  return (
    <div className="form-Question">
      <p className="QutionTitle">Workshop question</p>
      <div className="d-flex flex-column h-auto">
        <div className="d-flex justify-content-end p-0 mb-2">
          <button
            type="button"
            onClick={() => setIsLtr(!isLtr)}
            className="btn btn-info mx-1"
          >
            {isLtr ? "LTR" : "RTL"}
          </button>
          <button
            className="btn btn-secondary mx-1"
            onClick={clearButtonClickHandler}
          >
            Clear
          </button>
          <button
            className="btn btn-success mx-1"
            onClick={sendQuestionButtonClickHandler}
          >
            Send question
          </button>
        </div>
        <div className="SendQutionTextBox">
          {handleSuccess && (
            <span className="SentToast d-flex justify-content-center align-items-center">
              <i className="bi bi-check-circle text-success p-1" />
              <span className="p-1">Successfully sent</span>
              <i
                onClick={clearButtonClickHandler}
                className="bi bi-x p-1 cursor-pointer"
              />
            </span>
          )}
          <textarea
            ref={textAreaRef}
            className="new-question-txt form-control"
            id="new_question_txt"
            rows="8"
            placeholder="New Question typing"
            dir={isLtr ? "ltr" : "rtl"}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>
      </div>
      <div className="my-5">
        <p>History</p>
        <div className="SendQutionHistory">
          <ul>
            <QuestionMessage languagesList={broadcastLanguages} />
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionModule;
