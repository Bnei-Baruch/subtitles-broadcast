import React, { useState, useEffect } from "react";
import { Slide } from "../Components/Slide";
import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm
} from "../Utils/getCurrentBroadcastLanguage";
import {
  publishEvent,
  subscribeEvent,
  unSubscribeEvent,
} from "../Utils/Events";

const styles = {
  mainContainer: {
    outline: "1px solid rgb(204, 204, 204)",
    aspectRatio: "16/9",
    margin: "0 0 1px 0",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "65%",
  },
};

export function ActiveSlideMessaging(props) {
  const mqttClientId = sessionStorage.getItem("mqttClientId");
  const [subtitleMqttMessage, setSubtitleMqttMessage] = useState(null);
  const [questionMqttMessage, setQuestionMqttMessage] = useState(null);
  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const [broadcastLangObj, setBroadcastLangObj] = useState(() => {
    return getCurrentBroadcastLanguage();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;
  const subtitleMqttTopic = `subtitles_${broadcastProgrammCode}_${broadcastLangCode}`;
  const questionMqttTopic = `${broadcastLangCode}_questions_${broadcastProgrammCode}`;
  const [isSubTitleMode, setIsSubTitleMode] = useState(props.isSubTitleMode);
  const contextMqttMessage = isSubTitleMode
    ? subtitleMqttMessage
    : questionMqttMessage;

  if (props.isSubTitleMode !== isSubTitleMode) {
    setIsSubTitleMode(props.isSubTitleMode);
  }

  function findActiveSlide(userAddedList, activeSlideOrderNum) {
    let retSlide;

    for (let i = 0; i < userAddedList.slides.length; i++) {
      const lupSlide = userAddedList.slides[i];

      if (lupSlide.order_number === activeSlideOrderNum) {
        retSlide = lupSlide;
        break;
      }
    }

    return retSlide;
  }

  const determinePublishActiveSlide = (userAddedList, activatedTab) => {
    if (
      props.isSubTitleMode &&
      isSubTitleMode &&
      userAddedList &&
      activatedTab >= 0
    ) {
      const activeSlide = findActiveSlide(userAddedList, activatedTab);

      if (activeSlide) {
        if (
          !subtitleMqttMessage ||
          subtitleMqttMessage.slide !== activeSlide.slide
        ) {
          const lastMqttMessageJson = JSON.parse(
            sessionStorage.getItem("ActiveSlideMessaging")
          );

          var slideJsonMsg = {
            type: "subtitle",
            ID: activeSlide.ID,
            bookmark_id: activeSlide.bookmark_id,
            file_uid: activeSlide.file_uid,
            order_number: activeSlide.order_number,
            slide: activeSlide.slide,
            source_uid: activeSlide.source_uid,
            clientId: mqttClientId,
            date: new Date().toUTCString(),
          };
          setSubtitleMqttMessage(slideJsonMsg);

          if (
            !lastMqttMessageJson ||
            lastMqttMessageJson.slide !== activeSlide.slide
          ) {
            publishEvent("mqttPublush", {
              mqttTopic: subtitleMqttTopic,
              message: JSON.stringify(slideJsonMsg),
            });

            sessionStorage.setItem(
              "ActiveSlideMessaging",
              JSON.stringify(slideJsonMsg)
            );
          }
        }
      }
    }
  };

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent(subtitleMqttTopic, newMessageHandling);
      subscribeEvent(questionMqttTopic, newMessageHandling);
      console.log(
        "ActiveSlideMessaging subscribeEvent  DONE mqttTopic: ",
        subtitleMqttTopic
      );
    }
    subscribed = true;
  };
  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent(subtitleMqttTopic, newMessageHandling);
    subscribeEvent(questionMqttTopic, newMessageHandling);
  };

  useEffect(() => {
    window.onbeforeunload = function () {
      sessionStorage.removeItem("LastActiveSlidePublishedMessage");
    };

    return () => {
      window.onbeforeunload = null;
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log(
        "ActiveSlideMessaging publishEvent mqttSubscribe",
        subtitleMqttTopic
      );
      publishEvent("mqttSubscribe", {
        mqttTopic: subtitleMqttTopic,
      });
      publishEvent("mqttSubscribe", {
        mqttTopic: questionMqttTopic,
      });

      compSubscribeEvents();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, [isSubTitleMode]);

  const newMessageHandling = (event) => {
    console.log("ActiveSlideMessaging newMessageHandling", event);
    const newMessageJson = event.detail.messageJson;

    if (event.detail.mqttTopic === subtitleMqttTopic) {
      const lastMqttMessageJson = JSON.parse(
        sessionStorage.getItem("LastActiveSlidePublishedMessage")
      );
      const newMsgDateUtcJs = new Date(newMessageJson.date);

      if (
        !lastMqttMessageJson ||
        (lastMqttMessageJson.slide !== newMessageJson.slide &&
          newMsgDateUtcJs > new Date(lastMqttMessageJson.date))
      ) {
        setSubtitleMqttMessage(newMessageJson);

        sessionStorage.setItem(
          "LastActiveSlidePublishedMessage",
          JSON.stringify(newMessageJson)
        );

        const targetSlide = document.getElementById(
          `slide_${newMessageJson.ID}`
        );

        if (targetSlide) {
          if (!targetSlide.classList.contains("activeSlide")) {
            targetSlide.focus();
            targetSlide.click();
          }
        }
      }
    } else if (event.detail.mqttTopic === questionMqttTopic) {
      setQuestionMqttMessage(newMessageJson);
    }
  };

  determinePublishActiveSlide(props.userAddedList, props.activatedTab);

  return (
    <>
      <div style={styles.mainContainer}>
        <div className="green-part-cont" style={styles.greenPartContainer}>
          &nbsp;{" "}
        </div>
        <div className="slide-part-cont" >
          {contextMqttMessage && (
            <Slide
              data-key={contextMqttMessage.ID}
              key={contextMqttMessage.ID}
              content={contextMqttMessage.slide}
              isLtr={props.isLtr}
            ></Slide>
          )}
        </div>
      </div>
    </>
  );
}

export default ActiveSlideMessaging;
