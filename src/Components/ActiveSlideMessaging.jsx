import React, { useState, useEffect, useContext } from "react";
import { Slide } from "../Components/Slide";
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
import AppContext from "../AppContext";
import { broadcastLanguages } from "../Utils/Const";

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
  const [subtitlesDisplayModeMsg, setSubtitlesDisplayModeMsg] = useState(null);
  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const [broadcastLangObj, setBroadcastLangObj] = useState(() => {
    return getCurrentBroadcastLanguage();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;
  const subtitleMqttTopic = getSubtitleMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode,
  );
  const questionMqttTopic = getQuestionMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode,
  );
  const [subtitlesDisplayMode, setSubtitlesDisplayMode] = useState(
    props.isSubTitleMode,
  );
  const [contextMqttMessage, setContextMqttMessage] = useState(() => {
    return subtitlesDisplayMode === "sources"
      ? subtitleMqttMessage
      : subtitlesDisplayMode === "questions"
        ? questionMqttMessage
        : "";
  });
  const displayModeTopic = subtitlesDisplayModeTopic;
  const [otherQuestionMsgCol, setOtherQuestionMsgCol] = useState([]);
  const [otherQstColIndex, setOtherQstColIndex] = useState(0);

  const qstMqttTopicList = broadcastLanguages.map((langItem, index) => {
    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      langItem.value,
    );
    return mqttTopic;
  });

  if (props.subtitlesDisplayMode !== subtitlesDisplayMode) {
    setSubtitlesDisplayMode(props.subtitlesDisplayMode);
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
        } else {
          let slide = {
            ...userAddedList.slides[i],
            language: lupSlide.languages[languageIndex],
          };
          otherLangSlides.push(slide);
        }

        languageIndex++;
      } else {
        if (otherLangSlides.length > 0) {
          break;
        }
      }
    }

    let retObj = {
      activeSlideByLang: activeSlideByBroadCustLang,
      otherSlides: otherLangSlides,
    };
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
  };

  const determinePublishActiveSlide = (userAddedList, activatedTab) => {
    if (
      props.subtitlesDisplayMode === "sources" &&
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
            sessionStorage.getItem("ActiveSlideMessaging"),
          );

          if (
            !lastMqttMessageJson ||
            lastMqttMessageJson.slide !== activeSlide.slide
          ) {
            const slideJsonMsg = publishSlide(activeSlide, subtitleMqttTopic);
            setSubtitleMqttMessage(slideJsonMsg);

            sessionStorage.setItem(
              "ActiveSlideMessaging",
              JSON.stringify(slideJsonMsg),
            );

            if (otherSlides) {
              for (let index = 0; index < otherSlides.length; index++) {
                const slide = otherSlides[index];
                const topic = getSubtitleMqttTopic(
                  broadcastProgrammCode,
                  slide.language,
                );

                publishSlide(slide, topic);
              }
            }

            if (!subtitlesDisplayModeMsg) {
              const slideJsonMsg = publishSubtitlesDisplayMode("sources");
              setSubtitlesDisplayModeMsg(slideJsonMsg);
            }
          }
        }
      }
    }
  };

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent(displayModeTopic, newMessageHandling);
      subscribeEvent(subtitleMqttTopic, newMessageHandling);

      qstMqttTopicList.forEach((mqttTopic, index) => {
        subscribeEvent(mqttTopic, (event) => {
          newMessageHandling(event);
        });
      });
    }
    subscribed = true;
  };
  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent(displayModeTopic, newMessageHandling);
    unSubscribeEvent(subtitleMqttTopic, newMessageHandling);

    qstMqttTopicList.forEach((mqttTopic, index) => {
      unSubscribeEvent(mqttTopic, newMessageHandling);
    });
  };

  useEffect(() => {
    window.onbeforeunload = function () {
      sessionStorage.removeItem("LastActiveSlidePublishedMessage");
    };

    const timeoutId = setTimeout(() => {
      if (!subtitlesDisplayModeMsg) {
        const slideJsonMsg = publishSubtitlesDisplayMode("sources");
        setSubtitlesDisplayModeMsg(slideJsonMsg);
      }
    }, 0);

    return () => {
      window.onbeforeunload = null;
      clearTimeout(timeoutId);
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
      publishEvent("mqttSubscribe", {
        mqttTopic: subtitleMqttTopic,
      });
      publishEvent("mqttSubscribe", {
        mqttTopic: questionMqttTopic,
      });
      publishEvent("mqttSubscribe", {
        mqttTopic: displayModeTopic,
      });

      compSubscribeEvents();

      if (props.subtitlesDisplayMode) {
        if (
          !subtitlesDisplayModeMsg ||
          props.subtitlesDisplayMode !== subtitlesDisplayModeMsg.slide
        ) {
          publishSubtitlesDisplayMode(subtitlesDisplayMode);
        }
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, [subtitlesDisplayMode, subtitleMqttTopic]);

  useEffect(() => {
    if (subtitlesDisplayModeMsg && subtitlesDisplayModeMsg.slide) {
      const displayModeElmCol = document.getElementsByClassName(
        `${subtitlesDisplayModeMsg.slide}-mod`,
      );

      if (displayModeElmCol.length) {
        const trgDisplayModeElm = displayModeElmCol[0];

        if (trgDisplayModeElm) {
          if (!trgDisplayModeElm.classList.contains("display-mod-selected")) {
            trgDisplayModeElm.focus();
            trgDisplayModeElm.click();
          }
        }
      }
    }
  }, [subtitlesDisplayModeMsg]);

  useEffect(() => {
    let contextMessage;

    switch (subtitlesDisplayMode) {
      case "sources":
        contextMessage = subtitleMqttMessage;
        break;
      case "questions":
        contextMessage = questionMqttMessage; //JSON.parse(JSON.stringify(questionMqttMessage));
        break;
      case "none":
        contextMessage = "";
        break;
      default:
        contextMessage = subtitleMqttMessage;
        break;
    }

    setContextMqttMessage(contextMessage);
  }, [
    otherQuestionMsgCol,
    subtitlesDisplayMode,
    subtitleMqttMessage,
    questionMqttMessage,
    otherQstColIndex,
  ]);

  useEffect(() => {
    let timeoutId;

    if (subtitlesDisplayMode === "questions") {
      timeoutId = setInterval(() => {
        let newIndex = otherQstColIndex;

        if (newIndex > otherQuestionMsgCol.length) {
          newIndex = 0;
        }

        const contextMessage = questionMqttMessage; //JSON.parse(JSON.stringify(questionMqttMessage));

        if (otherQuestionMsgCol && otherQuestionMsgCol.length > 0) {
          const curOtherQstMsg = otherQuestionMsgCol[newIndex];

          if (curOtherQstMsg && curOtherQstMsg.visible) {
            let slideTextArr = contextMessage.slide.split(" <hr/>");
            contextMessage.slide = `${
              slideTextArr[0] + " <hr/> " + curOtherQstMsg.slide
            }`;
          }
          setContextMqttMessage(contextMessage);
        }

        setOtherQstColIndex(newIndex + 1);
      }, 10000);
    } else {
      setOtherQstColIndex(0);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    subtitlesDisplayMode,
    otherQstColIndex,
    otherQuestionMsgCol,
    questionMqttMessage,
  ]);

  const subtitleNewMessageHandling = (event, topic, newMessageJson) => {
    const lastMqttMessageJson = JSON.parse(
      sessionStorage.getItem("LastActiveSlidePublishedMessage"),
    );

    if (
      !lastMqttMessageJson ||
      lastMqttMessageJson.slide !== newMessageJson.slide
    ) {
      setSubtitleMqttMessage(newMessageJson);

      sessionStorage.setItem(
        "LastActiveSlidePublishedMessage",
        JSON.stringify(newMessageJson),
      );
    }

    const targetSlide = document.getElementById(`slide_${newMessageJson.ID}`);

    if (targetSlide) {
      const sourceUidAttrVal = targetSlide.getAttribute("source-uid");

      if (sourceUidAttrVal === newMessageJson.source_uid) {
        if (!targetSlide.classList.contains("activeSlide")) {
          targetSlide.focus();
          targetSlide.click();
        }
      }
    }
  };

  function otherQstMessageHandling(event, topic, newMessageJson) {
    if (newMessageJson && newMessageJson.lang !== broadcastLangCode) {
      if (broadcastLangCode === "he") {
        let otherQstMsgArrStr = sessionStorage.getItem("OtherQstMsgJsonList");
        let otherQstMsgArr;

        try {
          otherQstMsgArr = JSON.parse(otherQstMsgArrStr);
        } catch (error) {
          otherQstMsgArr = [];
        }

        if (!Array.isArray(otherQstMsgArr)) {
          otherQstMsgArr = [];
        }

        let newOtherQuestionMsgCol = [];

        newOtherQuestionMsgCol.push(newMessageJson);

        for (let index = 0; index < otherQstMsgArr.length; index++) {
          const curQuestionMqttMessage = otherQstMsgArr[index];

          if (curQuestionMqttMessage.lang !== newMessageJson.lang) {
            newOtherQuestionMsgCol.push(curQuestionMqttMessage);
          }
        }
        setOtherQuestionMsgCol(newOtherQuestionMsgCol);

        const otherQstMsgJsonListStr = JSON.stringify(newOtherQuestionMsgCol);
        sessionStorage.setItem("OtherQstMsgJsonList", otherQstMsgJsonListStr);
      }
    }
  }

  const newMessageHandling = (event) => {
    const newMessageJson = event.detail.messageJson || event.detail.message;
    const topic = event.detail.mqttTopic || event.detail.topic;

    switch (topic) {
      case subtitleMqttTopic:
        subtitleNewMessageHandling(event, topic, newMessageJson);
        break;
      case questionMqttTopic:
        setQuestionMqttMessage(newMessageJson);
        break;
      case displayModeTopic:
        if (newMessageJson && !newMessageJson.slide) {
          newMessageJson.slide = "none";
        }

        setSubtitlesDisplayModeMsg(newMessageJson);
        break;
      default:
        otherQstMessageHandling(event, topic, newMessageJson);
        break;
    }
  };

  const publishSubtitlesDisplayMode = (displayMode) => {
    const slideJsonMsg = {
      type: displayModeTopic,
      slide: displayMode,
      clientId: mqttClientId,
      date: new Date().toUTCString(),
    };

    publishEvent("mqttPublush", {
      mqttTopic: displayModeTopic,
      message: JSON.stringify(slideJsonMsg),
    });

    return slideJsonMsg;
  };

  determinePublishActiveSlide(props.userAddedList, props.activatedTab);

  return (
    <>
      <div style={styles.mainContainer}>
        <div
          className={`green-part-cont${
            !contextMqttMessage || !contextMqttMessage.slide
              ? " display-mode-none"
              : ""
          }`}
        >
          &nbsp;{" "}
        </div>
        <div className="slide-part-cont">
          {contextMqttMessage && contextMqttMessage.slide && (
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
