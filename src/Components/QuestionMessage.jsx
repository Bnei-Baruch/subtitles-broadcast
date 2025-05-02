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
    (state) => state.userSettings.userSettings.broadcast_language_code || "he",
  );
  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson",
  );
  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList,
  );
  const allQuestions = Object.values(questionMessagesList).flat();

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

  const isClearDisabled = (questionMsg) => {
    return (
      !questionMsg.slide || questionMsg.slide === questionMsg.previous_slide
    );
  };

  const isRestoreDisabled = (questionMsg) => {
    return (
      !questionMsg.previous_slide ||
      questionMsg.slide === questionMsg.previous_slide
    );
  };

  const publishQuestionUpdate = (updatedMessage) => {
    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      updatedMessage.lang ? updatedMessage.lang : broadcastLangCode,
    );

    dispatch(setUserInitiatedChange(true));
    dispatch(setSelectedQuestionMessage(updatedMessage));
    publishEvent("mqttPublish", {
      mqttTopic: mqttTopic,
      message: updatedMessage,
    });
  };

  const toggleQuestionVisibility = (questionMsg) => {
    const updatedMessage = {
      ...questionMsg,
      visible: !questionMsg.visible,
    };

    publishQuestionUpdate(updatedMessage);
  };

  const clearQuestionHandler = (questionMsg) => {
    if (isClearDisabled(questionMsg)) return;

    const updatedMessage = {
      ...questionMsg,
      previous_slide: questionMsg.slide,
      slide: "",
    };

    publishQuestionUpdate(updatedMessage);
  };

  const restoreQuestionHandler = (questionMsg) => {
    if (isRestoreDisabled(questionMsg)) return;

    const updatedMessage = {
      ...questionMsg,
      previous_slide: questionMsg.slide,
      slide: questionMsg.previous_slide,
    };

    publishQuestionUpdate(updatedMessage);
  };

  if (props.mode === "subtitle") {
    return (
      <>
        {allQuestions.length > 0 ? (
          allQuestions.map((obj) => (
            <div className="QuestionSection" data-key={obj.ID} key={obj.ID}>
              <div className="d-flex align-items-center p-2">
                {(broadcastLangCode === "he" ||
                  obj.lang === broadcastLangCode) && (
                  <div className="d-flex align-items-center">
                    <span className="language-label">
                      {getLanguageName(obj.lang ? obj.lang : obj.language)}
                    </span>
                    <i
                      className={
                        obj.visible
                          ? "bi bi-eye-fill mx-2"
                          : "bi bi-eye-slash-fill mx-2"
                      }
                      title={obj.visible ? "Hide Question" : "Show Question"}
                      onClick={() => toggleQuestionVisibility(obj)}
                      style={{ cursor: "pointer" }}
                    />
                    <i
                      className={`bi bi-arrow-counterclockwise mx-2 ${isRestoreDisabled(obj) ? "text-muted disabled" : ""}`}
                      onClick={() =>
                        !isRestoreDisabled(obj) && restoreQuestionHandler(obj)
                      }
                      title="Restore Question"
                      style={{
                        cursor: isRestoreDisabled(obj)
                          ? "not-allowed"
                          : "pointer",
                      }}
                    />
                    <i
                      className={`bi bi-trash3-fill mx-2 ${isClearDisabled(obj) ? "text-muted disabled" : ""}`}
                      onClick={() =>
                        !isClearDisabled(obj) && clearQuestionHandler(obj)
                      }
                      title="Clear Question"
                      style={{
                        cursor: isClearDisabled(obj)
                          ? "not-allowed"
                          : "pointer",
                      }}
                    />
                  </div>
                )}
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
                    {parseUtcStrToLocal(obj.date)}
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
