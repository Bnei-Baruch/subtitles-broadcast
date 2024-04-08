import React, { useRef, useState, useEffect } from "react";
import { GreenWindow } from "../Components/GreenWindow";
import { Slide } from "./Slide";

import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
} from "../Utils/Const";
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
    height: "70%",
  },
  slidePartContainer: {
    height: "30%",
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
  const [context, setContext] = useState();
  const [isSubTitleMode, setIsSubTitleMode] = useState(props.isSubTitleMode);
  let contextTmp = [];

  if (props.isSubTitleMode !== isSubTitleMode) {
    setIsSubTitleMode(props.isSubTitleMode);
  }

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent("mqttSubscribe", newMessageHandling);
    }
    subscribed = true;
  };
  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent("mqttSubscribe", newMessageHandling);
  };

  const mqttTopic = isSubTitleMode
    ? `subtitles_${broadcastProgrammCode}_${broadcastLangCode}`
    : `${broadcastLangCode}_questions_${broadcastProgrammCode}`;

  const lastMqttMessageStr = sessionStorage.getItem(
    `lastMqttMessage_${mqttTopic}`
  );
  const lastMqttMessageJson = JSON.parse(lastMqttMessageStr);

  if (
    (lastMqttMessageJson && !context) ||
    (lastMqttMessageJson &&
      context &&
      lastMqttMessageJson.slide !== context.slide)
  ) {
    setContext(lastMqttMessageJson);
  }

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

  const newMessageHandling = (data) => {
    console.log("GreenWindowButton newMessageHandling", data);
    contextTmp = data.detail.messageJson
      ? data.detail.messageJson
      : data.detail.message;
    setContext(contextTmp);
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
              {context && (
                <Slide
                  content={context.slide ? context.slide : context.context}
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
