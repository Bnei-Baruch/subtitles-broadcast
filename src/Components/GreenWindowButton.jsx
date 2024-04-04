import React, { useRef, useState, useEffect } from "react";
import { GreenWindow } from "../Components/GreenWindow";
import { Slide } from "./Slide";

import {
  broadcastLanguages,
  brodcastProgrammArr,
  broadcastLangMapObj,
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
  parseMqttMessage,
} from "../Utils/Const";
import {
  publishEvent,
  subscribeEvent,
  unsubscribeEvent,
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

export const GreenWindowButton = ({ isLtr, mqttMessage }) => {
  const [showGreenWindow, setShowGreenWindow] = useState(false);
  const elementRef = useRef(null);
  const publishedSlide = parseMqttMessage(mqttMessage);

  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });

  const [broadcastLangObj, setBroadcastLangObj] = useState(() => {
    return getCurrentBroadcastLanguage();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;
  const [context, setContext] = useState();
  const mqttTopic = `subtitles_${broadcastProgrammCode}_${broadcastLangCode}`;

  let contextTmp = [];

  useEffect(() => {
    console.log("ActiveSlideMessaging mqttSubscribe", mqttTopic);
    publishEvent("mqttSubscribe", {
      mqttTopic: mqttTopic,
    });

    subscribeEvent(mqttTopic, newMessageHandling);

    return () => {
      publishEvent("mqttUnSubscribe", {
        mqttTopic: mqttTopic,
      });
    };
  }, []);

  const newMessageHandling = (data) => {
    console.log("GreenWindowButton newMessageHandling", data);
    //const clientId = data.clientId;
    contextTmp = data.detail.messageJson;
    setContext(contextTmp);

    // if (newMessage && newMessage.clientId !== clientId) {
    //   setJobMqttMessage(newMessage);
    // }
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
                  content={context.slide}
                  isLtr={isLtr}
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
