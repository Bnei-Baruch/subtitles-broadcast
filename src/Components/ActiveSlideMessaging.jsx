import React, { useState, useEffect, useContext } from "react";
import { Slide } from "../Components/Slide";
import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
  getSubtitleMqttTopic,
  getQuestionMqttTopic,
} from "../Utils/Common";
import {
  publishEvent,
  subscribeEvent,
  unSubscribeEvent,
} from "../Utils/Events";
import AppContext from "../AppContext";

const styles = {
  mainContainer: {
    outline: "1px solid rgb(204, 204, 204)",
    aspectRatio: "16/9",
    margin: "0 0 1px 0",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "71.29%",
  },
};

export function ActiveSlideMessaging(props) {
  const appContextlData = useContext(AppContext);
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
  const subtitleMqttTopic = getSubtitleMqttTopic(broadcastProgrammCode, broadcastLangCode) ;
  const questionMqttTopic = getQuestionMqttTopic(broadcastProgrammCode, broadcastLangCode) ;
  const [isSubTitleMode, setIsSubTitleMode] = useState(props.isSubTitleMode);
  const contextMqttMessage = isSubTitleMode
    ? subtitleMqttMessage
    : questionMqttMessage;

  if (props.isSubTitleMode !== isSubTitleMode) {
    setIsSubTitleMode(props.isSubTitleMode);
  }

  function findActiveSlides(userAddedList, activeSlideOrderNum) {
    let activeSlideByBroadCustLang;
    let languageIndex = 0;
    let otherLangSlides = [];

    for (let i = 0; i < userAddedList.slides.length; i++) {
      const lupSlide = userAddedList.slides[i];

      if (lupSlide.order_number === activeSlideOrderNum) {
        let language = lupSlide.languages[languageIndex];

        if (language === broadcastLangCode) {
          activeSlideByBroadCustLang = lupSlide;
        }
        else {
          let slide = { ...userAddedList.slides[i], language: lupSlide.languages[languageIndex] };
          otherLangSlides.push(slide);
        }

        languageIndex++
      }
      else {
        if (otherLangSlides.length > 0) {
          break;
        }
      }
    }

    let retObj = { activeSlideByLang: activeSlideByBroadCustLang, otherSlides: otherLangSlides };
    return retObj;
  }

  const publishSlide = (slide, topic) => {
    const slideJsonMsg = {
      type: "subtitle",
      ID: slide.ID,
      bookmark_id: slide.bookmark_id,
      file_uid: slide.file_uid,
      order_number: slide.order_number,
      slide: slide.slide,
      source_uid: slide.source_uid,
      clientId: mqttClientId,
      date: new Date().toUTCString(),
    };

    publishEvent("mqttPublush", {
      mqttTopic: topic,
      message: JSON.stringify(slideJsonMsg),
    });

    return slideJsonMsg;
  }

  const determinePublishActiveSlide = (userAddedList, activatedTab) => {
    if (
      props.isSubTitleMode &&
      isSubTitleMode &&
      userAddedList &&
      activatedTab >= 0
    ) {
      const activeSlideObj = findActiveSlides(userAddedList, activatedTab);
      const activeSlide = activeSlideObj.activeSlideByLang;
      const otherSlides = activeSlideObj.otherSlides;

      if (activeSlide) {
        if (
          !subtitleMqttMessage ||
          subtitleMqttMessage.slide !== activeSlide.slide
        ) {
          const lastMqttMessageJson = JSON.parse(
            sessionStorage.getItem("ActiveSlideMessaging")
          );


          if (
            !lastMqttMessageJson ||
            lastMqttMessageJson.slide !== activeSlide.slide
          ) {
            const slideJsonMsg = publishSlide(activeSlide, subtitleMqttTopic);
            setSubtitleMqttMessage(slideJsonMsg);

            sessionStorage.setItem(
              "ActiveSlideMessaging",
              JSON.stringify(slideJsonMsg)
            );

            if (otherSlides) {
              for (let index = 0; index < otherSlides.length; index++) {
                const slide = otherSlides[index];
                const topic = getSubtitleMqttTopic(broadcastProgrammCode, slide.language) ;

                publishSlide(slide, topic);
              }
            }
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
      // console.log("ActiveSlideMessaging subscribeEvent  DONE mqttTopic: ", subtitleMqttTopic);
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
    if (broadcastLangCode !== appContextlData.broadcastLang.value) {
      setBroadcastLangObj(appContextlData.broadcastLang);
    }

  }, [appContextlData.broadcastLang.value]);
  
  useEffect(() => {
    if (broadcastProgrammCode !== appContextlData.broadcastProgramm.value) {
      setBroadcastProgrammObj(appContextlData.broadcastProgramm);
    }

  }, [appContextlData.broadcastProgramm.value]);
  
  useEffect(() => {
    if (broadcastLangCode !== appContextlData.broadcastLang.value) {
      setBroadcastLangObj(appContextlData.broadcastLang);
    }
  }, [appContextlData.broadcastLang.value]);


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // console.log("ActiveSlideMessaging publishEvent mqttSubscribe", subtitleMqttTopic);

      compSubscribeEvents();

      publishEvent("mqttSubscribe", {
        mqttTopic: subtitleMqttTopic,
      });
      publishEvent("mqttSubscribe", {
        mqttTopic: questionMqttTopic,
      });
    }, 0);


    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, [isSubTitleMode, subtitleMqttTopic]);

  const newMessageHandling = (event) => {
    // console.log("ActiveSlideMessaging newMessageHandling", event);
    const newMessageJson = event.detail.messageJson || event.detail.message;
    const topic = event.detail.mqttTopic || event.detail.topic;

    if (topic === subtitleMqttTopic) {
      const lastMqttMessageJson = JSON.parse(
        sessionStorage.getItem("LastActiveSlidePublishedMessage")
      );

      if (
        !lastMqttMessageJson ||
        (lastMqttMessageJson.slide !== newMessageJson.slide)
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
    } else if (topic === questionMqttTopic) {
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
