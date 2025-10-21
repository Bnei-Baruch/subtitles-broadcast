import React, { useState, useEffect, useRef } from "react";
import "./PagesCSS/Questions.css";
import { Slide } from "../Components/Slide";
import { broadcastLangMapObj, ST_QUESTION } from "../Utils/Const";
import { languageIsLtr } from "../Utils/Common";
import { publishQuestion } from "../Utils/UseMqttUtils";
import { useSelector } from "react-redux";

const messageTime = (message) => message.date ? new Date(message.date).getTime() : 0;

const parseUtcStrToLocal = (utcDateStr) => {
  let retVal = utcDateStr;
  if (utcDateStr) {
    const locDate = new Date(utcDateStr);
    retVal = `Date: ${locDate.toLocaleDateString()}  Time: ${locDate.toLocaleTimeString()}`;
  }
  return retVal;
};

const QuestionModule = () => {
  const [questionText, setQuestionText] = useState("");
  const [handleSuccess, setHandleSuccess] = useState(false);
  const textAreaRef = useRef(null);
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const broadcastProgrammCode = useSelector((state) => state.userSettings.userSettings.broadcast_program_code || "morning_lesson");
  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode
  );
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const [isLtr, setIsLtr] = useState(languageIsLtr(broadcastLangCode));

  const mqttLogs = useSelector((state) => state.mqtt.mqttLogs);
  const allQuestions = mqttLogs.filter((message) => message.type === ST_QUESTION).sort((a, b) => messageTime(b) - messageTime(a));

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
      slide_type: "question",
      renderer: "default",
      ID: Math.random().toString(16).substring(2, 8),
      lang: broadcastLangCode,
      slide: questionText,
      visible: true,
      isLtr: isLtr,
      display_status: subtitlesDisplayMode,
    };

    publishQuestion(
      jsonMsg,
      mqttMessages,
      broadcastProgrammCode,
      broadcastLangCode,
      subtitlesDisplayMode,
      /* ignoreLiveMode */ true,
    );

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
      <Slide content={questionText} isLtr={isLtr} isQuestion={true} renderer={"default"} />
      <div className="my-5">
        <p>History</p>
        <div className="SendQutionHistory">
          <ul>
            {allQuestions.length > 0 ? (
              allQuestions.map((question, index) => (
                <div key={index}>
                  <div>
                    <li className="item">
                      <span className="datetime">
                        {parseUtcStrToLocal(question.date)}
                        &nbsp;&nbsp;
                        {broadcastLangMapObj[question.lang].label}
                        &nbsp;&nbsp;
                        {question.username}
                      </span>
                      <br />
                      <div className={`message ${question.isLtr ? "ltr" : "rtl"}`}>
                        {question.orgSlide ? question.orgSlide : question.slide}
                      </div>
                    </li>
                    <hr />
                  </div>
                </div>
              ))
            ) : (
              <p>No questions available</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionModule;
