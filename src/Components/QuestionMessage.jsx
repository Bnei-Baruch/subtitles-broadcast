import React from "react";
import { broadcastLangMapObj } from "../Utils/Const";
import { getQuestionMqttTopic } from "../Utils/Common";
import { publishEvent } from "../Utils/Events";
import { Slide } from "./Slide";
import { useSelector, useDispatch } from "react-redux";
import {
  setUserInitiatedChange,
  setSelectedQuestionMessage,
} from "../Redux/MQTT/mqttSlice";

const QuestionMessage = (props) => {
  const dispatch = useDispatch();

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );

  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList
  );

  const parseUtcStrToLocal = (utcDateStr) => {
    let retVal = utcDateStr;

    if (utcDateStr) {
      const locDate = new Date(utcDateStr);
      retVal = `Date: ${locDate.toLocaleDateString()}  Time: ${locDate.toLocaleTimeString()}`;
    }

    return retVal;
  };

  const getLanguageName = (langCode) => {
    const langName = broadcastLangMapObj[langCode].label;
    return langName;
  };
  const languageIsLtr = (langCode) => {
    let isLeftToRight = true;

    if (langCode) {
      const lnagObj = broadcastLangMapObj[langCode];

      if (lnagObj) {
        isLeftToRight = !(lnagObj.isLtr === false);
      }
    }

    return isLeftToRight;
  };

  const sendQuestionButtonClickHandler = (questionMsg) => {
    const updatedMessage = {
      ...questionMsg,
      visible: !questionMsg.visible,
    };

    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      questionMsg.lang ? questionMsg.lang : broadcastLangCode
    );

    dispatch(setUserInitiatedChange(true));
    dispatch(setSelectedQuestionMessage(updatedMessage));
    publishEvent("mqttPublush", {
      mqttTopic: mqttTopic,
      message: updatedMessage,
    });
  };

  const allQuestions = Object.values(questionMessagesList).flat();

  if (props.mode === "subtitle") {
    return (
      <>
        {allQuestions.length > 0 ? (
          allQuestions.map((obj) => (
            <div className="QuestionSection" data-key={obj.ID} key={obj.ID}>
              <div className="d-flex h-auto p-2">
                <i
                  className={
                    obj.visible ? "bi bi-eye-fill" : "bi bi-eye-slash-fill"
                  }
                  onClick={() => sendQuestionButtonClickHandler(obj)}
                />
                <span>
                  {getLanguageName(obj.lang ? obj.lang : obj.language)}
                </span>
              </div>
              <Slide
                content={obj.orgSlide ? obj.orgSlide : obj.slide}
                isLtr={languageIsLtr(obj.lang ? obj.lang : obj.language)}
                isQuestion={obj.type === "question"}
              ></Slide>
            </div>
          ))
        ) : (
          <p>No questions available</p>
        )}
      </>
    );
  } else if (props.mode === "slide") {
    return (
      <>
        {allQuestions.length > 0 ? (
          allQuestions.map((obj) => (
            <div data-key={obj.ID} key={obj.ID} style={{ height: "200px" }}>
              <Slide
                content={obj.slide}
                isLtr={languageIsLtr(obj.lang ? obj.lang : obj.language)}
                isQuestion={
                  obj.type === "question" || obj.slide_type === "question"
                }
              ></Slide>
            </div>
          ))
        ) : (
          <p>No questions available</p>
        )}
      </>
    );
  } else {
    return (
      <>
        {allQuestions.length > 0 ? (
          allQuestions.map((obj) => (
            <div data-key={obj.ID} key={obj.ID}>
              <div>
                <li className="item">
                  <span className="datetime">
                    Date: {parseUtcStrToLocal(obj.date)}
                  </span>
                  <br />
                  <div
                    className={`message ${
                      languageIsLtr(obj.lang ? obj.lang : obj.language)
                        ? "ChangeToLtr"
                        : "ChangeToRtl"
                    }`}
                  >
                    {obj.orgSlide ? obj.orgSlide : obj.slide}
                  </div>
                </li>
                <hr />
              </div>
            </div>
          ))
        ) : (
          <p>No questions available</p>
        )}
      </>
    );
  }
};

export default QuestionMessage;
