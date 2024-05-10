import React, { useRef, useState, useEffect } from "react";
import { GreenWindow } from "../Components/GreenWindow";
import { Slide } from "./Slide";

import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm
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
  const [isSubTitleMode, setIsSubTitleMode] = useState(props.isSubTitleMode);
  const subtitleMqttTopic = `subtitles_${broadcastProgrammCode}_${broadcastLangCode}`;
  const questionMqttTopic = `${broadcastLangCode}_questions_${broadcastProgrammCode}`;

  const contextMqttMessage = isSubTitleMode
    ? subtitleMqttMessage
    : questionMqttMessage;

  if (props.isSubTitleMode !== isSubTitleMode) {
    setIsSubTitleMode(props.isSubTitleMode);
  }

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent(subtitleMqttTopic, newMessageHandling);
      subscribeEvent(questionMqttTopic, newMessageHandling);
    }
    subscribed = true;
  };
  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent(subtitleMqttTopic, newMessageHandling);
    subscribeEvent(questionMqttTopic, newMessageHandling);
  };

  const mqttTopic = isSubTitleMode
    ? `subtitles_${broadcastProgrammCode}_${broadcastLangCode}`
    : `${broadcastLangCode}_questions_${broadcastProgrammCode}`;

  useEffect(() => {
    console.log("GreenWindowButton useEffect publishEvent ", mqttTopic);

    const timeoutId = setTimeout(() => {
      publishEvent("mqttSubscribe", {
        mqttTopic: mqttTopic,
      });

      compSubscribeEvents();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, [isSubTitleMode]);

  const newMessageHandling = (event) => {
    console.log("GreenWindowButton newMessageHandling", event);

    if (event.detail.mqttTopic === subtitleMqttTopic) {
      setSubtitleMqttMessage(event.detail.messageJson);
    } else if (event.detail.mqttTopic === questionMqttTopic) {
      setQuestionMqttMessage(event.detail.messageJson);
    }
  };

  return (
    <>
      <button
        onClick={() =>
          closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)
        }
        className={getButtonClassName(showGreenWindow)}
      >
        Open Green Screen
      </button>
      {showGreenWindow && (
        <GreenWindow
          closeWinUnloadingRef={() =>
            closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)
          }
        >
          <div style={styles.mainContainer}>
            <div
              className="green-part-cont"
              style={styles.greenPartContainer}
            ></div>
            <div className="slide-part-cont" style={styles.slidePartContainer}>
              {contextMqttMessage && (
                <Slide
                  content={
                    contextMqttMessage.slide
                      ? contextMqttMessage.slide
                      : contextMqttMessage.context
                  }
                  isLtr={props.isLtr}
                  parentElement={elementRef}
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
