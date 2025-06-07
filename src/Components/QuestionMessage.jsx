import React from "react";
import { broadcastLangMapObj } from "../Utils/Const";
import { publishQuestion } from "../Utils/UseMqttUtils";
import { Slide } from "./Slide";
import { useSelector } from "react-redux";
import { useDeepMemo } from "../Utils/Common";
import { getAllQuestions } from "../Redux/MQTT/mqttSlice";

const QuestionMessage = () => {
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );
  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode
  );

  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const questionMessagesList = useDeepMemo(getAllQuestions(mqttMessages, broadcastProgrammCode));
  const allQuestions = Object.values(questionMessagesList).flat();

  const isLiveModeEnabled = useSelector(
    (state) => state.mqtt.isLiveModeEnabled
  );

  const getLanguageName = (langCode) => {
    if (!langCode) {
      return "Unknown";
    }
    const langName = broadcastLangMapObj[langCode].label;
    return langName;
  };

  const isClearDisabled = (questionMsg) => {
    return (
      !isLiveModeEnabled ||
      !questionMsg.slide ||
      questionMsg.slide === questionMsg.previous_slide
    );
  };

  const isVisibilityDisabled = () => {
    return !isLiveModeEnabled;
  };

  const isRestoreDisabled = (questionMsg) => {
    console.log(isLiveModeEnabled, questionMsg.previous_slide, questionMsg.slide, questionMsg.previous_slide);
    return (
      !isLiveModeEnabled ||
      !questionMsg.previous_slide ||
      questionMsg.slide === questionMsg.previous_slide
    );
  };

  const publishQuestionUpdate = (updatedMessage) => {
    publishQuestion(
      updatedMessage,
      mqttMessages,
      broadcastProgrammCode,
      updatedMessage.lang ? updatedMessage.lang : broadcastLangCode,
      subtitlesDisplayMode
    );
  };

  const toggleQuestionVisibility = (questionMsg) => {
    if (isVisibilityDisabled()) return;

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

  return (
    <>
      {allQuestions.length > 0 ? (
        allQuestions.map((question) => (
          <div className="QuestionSection" data-key={question.ID} key={question.ID}>
            <div className="d-flex align-items-center p-2">
              {(broadcastLangCode === "he" ||
                question.lang === broadcastLangCode) && (
                <div className="d-flex align-items-center">
                  <span className="language-label">
                    {getLanguageName(question.lang ? question.lang : question.language)}
                  </span>
                  <i
                    className={`mx-2 ${
                      question.visible ? "bi bi-eye-fill" : "bi bi-eye-slash-fill"
                    } ${isVisibilityDisabled() ? "text-muted disabled" : ""}`}
                    title={question.visible ? "Hide Question" : "Show Question"}
                    onClick={() => toggleQuestionVisibility(question)}
                    style={{ cursor: "pointer" }}
                  />
                  <i
                    className={`bi bi-arrow-counterclockwise mx-2 ${isRestoreDisabled(question) ? "text-muted disabled" : ""}`}
                    onClick={() =>
                      !isRestoreDisabled(question) && restoreQuestionHandler(question)
                    }
                    title="Restore Question"
                    style={{
                      cursor: isRestoreDisabled(question)
                        ? "not-allowed"
                        : "pointer",
                    }}
                  />
                  <i
                    className={`bi bi-trash3-fill mx-2 ${isClearDisabled(question) ? "text-muted disabled" : ""}`}
                    onClick={() =>
                      !isClearDisabled(question) && clearQuestionHandler(question)
                    }
                    title="Clear Question"
                    style={{
                      cursor: isClearDisabled(question)
                        ? "not-allowed"
                        : "pointer",
                    }}
                  />
                </div>
              )}
            </div>

            <Slide
              content={question.orgSlide ? question.orgSlide : question.slide}
              isLtr={question.isLtr}
              isQuestion={question.type === "question"}
            ></Slide>
          </div>
        ))
      ) : (
        <p>No questions available</p>
      )}
    </>
  );
};

export default QuestionMessage;
