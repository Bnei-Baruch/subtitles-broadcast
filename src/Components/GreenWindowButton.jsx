import React, { useRef, useState, useEffect } from "react";
import { GreenWindow } from "../Components/GreenWindow";
import { Slide } from "./Slide";

import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
  getSubtitleMqttTopic,
  getQuestionMqttTopic,
  subtitlesDisplayModeTopic,
} from "../Utils/Common";
import {
  publishEvent,
  subscribeEvent,
  unSubscribeEvent,
} from "../Utils/Events";

function getButtonClassName(showGreenWindow, isButtonDisabled) {
  var className = showGreenWindow
    ? "btn btn-success"
    : "btn btn-tr fw-bold text-success";

  if (isButtonDisabled) {
    className += " opacity-50 cursor-na";
  }

  return className;
}

function closeGreenWindowHandling(setShowGreenWindow, showGreenWindow) {
  setShowGreenWindow(!showGreenWindow);
}

const styles = {
  mainContainer: {
    height: "100%",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "71.29%",
  },
  slidePartContainer: {
    padding: "0",
  },
  cursorNotAllowed: {
    cursor: "not-allowed",
  },
};

export const GreenWindowButton = (props) => {
  const [showGreenWindow, setShowGreenWindow] = useState(false);
  const elementRef = useRef(null);
  const broadcastProgrammObj = getCurrentBroadcastProgramm();
  const broadcastLangObj = getCurrentBroadcastLanguage();
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;
  const [subtitleMqttMessage, setSubtitleMqttMessage] = useState(null);
  const [questionMqttMessage, setQuestionMqttMessage] = useState(null);
  const [subtitlesDisplayModeMsg, setSubtitlesDisplayModeMsg] = useState(null);
  const [subtitlesDisplayMode, setSubtitlesDisplayMode] = useState(
    props.subtitlesDisplayMode
  );
  const subtitleMqttTopic = getSubtitleMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );
  const questionMqttTopic = getQuestionMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );
  const [contextMqttMessage, setContextMqttMessage] = useState(null);
  const displayModeTopic = subtitlesDisplayModeTopic;

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent(displayModeTopic, newMessageHandling);
      subscribeEvent(subtitleMqttTopic, newMessageHandling);
      subscribeEvent(questionMqttTopic, newMessageHandling);
    }
    subscribed = true;
  };
  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent(displayModeTopic, newMessageHandling);
    unSubscribeEvent(subtitleMqttTopic, newMessageHandling);
    unSubscribeEvent(questionMqttTopic, newMessageHandling);
  };

  const mqttTopic = subtitlesDisplayMode
    ? getSubtitleMqttTopic(broadcastProgrammCode, broadcastLangCode)
    : getQuestionMqttTopic(broadcastProgrammCode, broadcastLangCode);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      publishEvent("mqttSubscribe", {
        mqttTopic: mqttTopic,
      });
      publishEvent("mqttSubscribe", {
        mqttTopic: questionMqttTopic,
      });
      publishEvent("mqttSubscribe", {
        mqttTopic: displayModeTopic,
      });

      compSubscribeEvents();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, [broadcastLangCode, broadcastProgrammCode]);

  useEffect(() => {
    determinecontextMqttMessage(subtitlesDisplayMode);
  }, [
    subtitlesDisplayMode,
    subtitlesDisplayModeMsg,
    subtitleMqttMessage,
    questionMqttMessage,
  ]);

  const newMessageHandling = (event) => {
    const newMessageJson = event.detail.messageJson || event.detail.message;
    const topic = event.detail.mqttTopic || event.detail.topic;

    switch (topic) {
      case subtitleMqttTopic:
        setSubtitleMqttMessage(newMessageJson);
        break;
      case questionMqttTopic:
        setQuestionMqttMessage(newMessageJson);
        break;
      case displayModeTopic:
        setSubtitlesDisplayModeMsg(newMessageJson);
        break;
      default:
        break;
    }
  };

  function determinecontextMqttMessage(displayMode) {
    switch (props.subtitlesDisplayMode) {
      case "sources":
        setContextMqttMessage(subtitleMqttMessage);
        break;
      case "questions":
        setContextMqttMessage(questionMqttMessage);
        break;
      default:
        setContextMqttMessage("");
        break;
    }
  }

  return (
    <>
      <button
        onClick={() =>
          closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)
        }
        className={getButtonClassName(showGreenWindow)}
      >
        Green Screen
      </button>
      {showGreenWindow && (
        <GreenWindow
          closeWinUnloadingRef={() =>
            closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)
          }
        >
          <div style={styles.mainContainer}>
            <div
              className={`green-part-cont${
                !contextMqttMessage || !contextMqttMessage.slide
                  ? " display-mode-none"
                  : ""
              }`}
            ></div>
            <div
              className={`slide-part-cont${
                !contextMqttMessage || !contextMqttMessage.slide
                  ? " display-mode-none"
                  : ""
              }`}
              style={styles.slidePartContainer}
            >
              {contextMqttMessage && contextMqttMessage.slide && (
                <Slide
                  content={
                    contextMqttMessage.slide
                      ? contextMqttMessage.slide
                      : contextMqttMessage.context
                  }
                  parentElement={elementRef}
                  isLtr={
                    typeof contextMqttMessage.isLtr === "boolean"
                      ? contextMqttMessage.isLtr
                      : typeof contextMqttMessage.left_to_right === "boolean"
                        ? contextMqttMessage.left_to_right
                        : props.isLtr
                  }
                  isQuestion={contextMqttMessage.type === "question"}
                ></Slide>
              )}
            </div>
          </div>
        </GreenWindow>
      )}
    </>
  );
};

export default GreenWindowButton;
