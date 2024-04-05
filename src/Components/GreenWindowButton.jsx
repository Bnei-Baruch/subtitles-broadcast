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

export const GreenWindowButton = (props) => {
  const [showGreenWindow, setShowGreenWindow] = useState(false);
  const elementRef = useRef(null);
  const publishedSlide = parseMqttMessage(props.mqttMessage);

  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });

  const [broadcastLangObj, setBroadcastLangObj] = useState(() => {
    return getCurrentBroadcastLanguage();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;
  const [context, setContext] = useState();
  const [isSubTitleMode, setIsSubTitleMode] = useState(props.isSubTitleMode);
  let contextTmp = [];

  if (props.isSubTitleMode !== isSubTitleMode) {
    setIsSubTitleMode(props.isSubTitleMode);
  }
  // useEffect(() => {
  //   //console.log("GreenWindowButton useEffect");
  //   // publishEvent("mqttSubscribe", {
  //   //   mqttTopic: mqttTopic,
  //   // });
  //   // subscribeEvent(mqttTopic, function (data) {
  //   //   return newMessageHandling(data);
  //   // });
  //   // return () => {
  //   //   unsubscribeEvent(mqttTopic, function (data) {
  //   //     return newMessageHandling(data);
  //   //   });
  //   // };
  // }, []);

  useEffect(() => {
    const mqttTopic = isSubTitleMode
      ? `subtitles_${broadcastProgrammCode}_${broadcastLangCode}`
      : `${broadcastLangCode}_questions_${broadcastProgrammCode}`;

    console.log("GreenWindowButton useEffect publishEvent ", mqttTopic);

    const timeoutId = setTimeout(() => {
      subscribeEvent(mqttTopic, function (data) {
        return newMessageHandling(data);
      });

      publishEvent("mqttSubscribe", {
        mqttTopic: mqttTopic,
      });
    }, 0);

    return () => {
      //clearTimeout(timeoutId);

      unsubscribeEvent(mqttTopic, function (data) {
        return newMessageHandling(data);
      });
    };
  }, [isSubTitleMode]);

  const newMessageHandling = (data) => {
    console.log("GreenWindowButton newMessageHandling", data);
    //const clientId = data.clientId;
    contextTmp = data.detail.messageJson
      ? data.detail.messageJson
      : data.detail.message;
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
