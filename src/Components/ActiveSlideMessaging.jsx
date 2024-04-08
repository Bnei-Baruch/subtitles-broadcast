import React, { useState, useEffect } from "react";
import { Slide } from "../Components/Slide";
import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
} from "../Utils/Const";
import {
  publishEvent,
  subscribeEvent,
  unsubscribeEvent,
} from "../Utils/Events";

const styles = {
  mainContainer: {
    outline: "1px solid rgb(204, 204, 204)",
    aspectRatio: "16/8",
    margin: "0 0 1px 0",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "65%",
  },
  slidePartContainer: {
    height: "35%",
    textAlign: "left",
    padding: "0",
    margin: "0",
  },
};

export function ActiveSlideMessaging(props) {
  const mqttClientId = sessionStorage.getItem("mqttClientId");
  const [mqttMessage, setMqttMessage] = useState(null);
  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const [broadcastLangObj, setBroadcastLangObj] = useState(() => {
    return getCurrentBroadcastLanguage();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;
  const mqttTopic = `subtitles_${broadcastProgrammCode}_${broadcastLangCode}`;

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
    if (userAddedList && activatedTab) {
      if (!mqttMessage || mqttMessage.order_number !== activatedTab) {
        const activeSlide = findActiveSlide(userAddedList, activatedTab);

        if (activeSlide) {
          const lastMqttMessageJson = JSON.parse(
            sessionStorage.getItem("LastActiveSlidePublishedMessage")
          );

          if (
            !lastMqttMessageJson ||
            Number(lastMqttMessageJson.order_number) !== activatedTab
          ) {
            var jsonMsg = {
              ID: activeSlide.ID,
              bookmark_id: activeSlide.bookmark_id,
              file_uid: activeSlide.file_uid,
              order_number: activeSlide.order_number,
              slide: activeSlide.slide,
              source_uid: activeSlide.source_uid,
              clientId: mqttClientId,
            };

            publishEvent("mqttPublush", {
              mqttTopic: mqttTopic,
              message: JSON.stringify(jsonMsg),
            });

            sessionStorage.setItem(
              "LastActiveSlidePublishedMessage",
              JSON.stringify(jsonMsg)
            );
          }
        }
      }
    }
  };

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent(mqttTopic, newMessageHandling);
      console.log(
        "ActiveSlideMessaging subscribeEvent  DONE mqttTopic: ",
        mqttTopic
      );
    }
    subscribed = true;
  };
  const compUnSubscribeAppEvents = () => {
    unsubscribeEvent("mqttSubscribe", newMessageHandling);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log("ActiveSlideMessaging publishEvent mqttSubscribe", mqttTopic);
      publishEvent("mqttSubscribe", {
        mqttTopic: mqttTopic,
      });

      compSubscribeEvents();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, []);

  const newMessageHandling = (event) => {
    console.log("ActiveSlideMessaging newMessageHandling", event);
    const newMessageJson = event.detail.messageJson;

    const lastMqttMessageJson = JSON.parse(
      sessionStorage.getItem("LastActiveSlidePublishedMessage")
    );

    if (
      props.userAddedList &&
      props.activatedTab &&
      lastMqttMessageJson.order_number !== props.activatedTab
    ) {
      props.setActivatedTab(lastMqttMessageJson.order_number);
    }

    setMqttMessage(newMessageJson);
  };

  determinePublishActiveSlide(props.userAddedList, props.activatedTab);

  return (
    <>
      <div style={styles.mainContainer}>
        <div className="green-part-cont" style={styles.greenPartContainer}>
          &nbsp;{" "}
        </div>
        <div className="slide-part-cont" style={styles.slidePartContainer}>
          {mqttMessage && (
            <Slide
              data-key={mqttMessage.ID}
              key={mqttMessage.ID}
              content={mqttMessage.slide}
              isLtr={props.isLtr}
            ></Slide>
          )}
        </div>
      </div>
    </>
  );
}

export default ActiveSlideMessaging;
