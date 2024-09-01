import React, { useState, useEffect, useContext } from "react";
import { Slide } from "../Components/Slide";
import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
  getSubtitleMqttTopic,
  getQuestionMqttTopic,
  subtitlesDisplayModeTopic,
  getMqttClientId,
} from "../Utils/Common";
import {
  publishEvent,
  subscribeEvent,
  unSubscribeEvent,
} from "../Utils/Events";
import AppContext from "../AppContext";
import { broadcastLanguages } from "../Utils/Const";
import session from "redux-persist/lib/storage/session";

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
  const qstSwapTime = 5000; // 5s
  const appContextlData = useContext(AppContext);
  const [mqttClientId] = useState(() => {
    return getMqttClientId();
  });

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
    broadcastLangCode
  );
  const questionMqttTopic = getQuestionMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );
  const [subtitlesDisplayMode, setSubtitlesDisplayMode] = useState(
    props.isSubTitleMode
  );
  const [contextMqttMessage, setContextMqttMessage] = useState(() => {
    return subtitlesDisplayMode === "sources"
      ? subtitleMqttMessage
      : subtitlesDisplayMode === "questions"
        ? questionMqttMessage
        : "";
  });
  const displayModeTopic = subtitlesDisplayModeTopic;
  const [otherQuestionMsgCol, setOtherQuestionMsgCol] = useState({});
  const [otherQstColIndex, setOtherQstColIndex] = useState(1);
  const [otherQstMsgColLength, setOtherQstMsgColLength] = useState(0);
  const [rounRobinQstMsgCol, setRounRobinQstMsgCol] = useState([]);

  const qstMqttTopicList = broadcastLanguages.map((langItem, index) => {
    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      langItem.value
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

  const publishSlide = (slide, topic, isJsonMsg) => {
    let slideJsonMsg;

    if (isJsonMsg) {
      slide.clientId = mqttClientId;
      slide.date = new Date().toUTCString();

      publishEvent("mqttPublush", {
        mqttTopic: topic,
        message: JSON.stringify(slide),
      });
    } else {
      slideJsonMsg = {
        clientId: mqttClientId,
        type: "subtitle",
        ID: slide.ID,
        bookmark_id: slide.bookmark_id,
        file_uid: slide.file_uid,
        order_number: slide.order_number,
        slide: slide.slide,
        source_uid: slide.source_uid,
        date: new Date().toUTCString(),
        isLtr: slide.left_to_right === false ? false : true,
      };

      publishEvent("mqttPublush", {
        mqttTopic: topic,
        message: JSON.stringify(slideJsonMsg),
      });
    }

    return slideJsonMsg;
  };

  const determinePublishActiveSlide = (userAddedList, activatedTab) => {
    if (
      (!props.subtitlesDisplayMode ||
        props.subtitlesDisplayMode === "sources") &&
      userAddedList &&
      activatedTab >= 0
    ) {
      const activeSlideObj = findActiveSlides(userAddedList, activatedTab);
      const activeSlide = activeSlideObj.activeSlideByLang;
      const otherSlides = activeSlideObj.otherSlides;

      if (
        activeSlide &&
        (activeSlide.slide_type !== "question" ||
          (activeSlide.slide_type === "question" &&
            Number(sessionStorage.getItem("rounRobinIndex")) <= 0))
      ) {
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
                const topic = getSubtitleMqttTopic(
                  broadcastProgrammCode,
                  slide.language
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
      publishComplexQstMsg();
    }, 500);

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
        `${subtitlesDisplayModeMsg.slide}-mod`
      );

      if (displayModeElmCol.length) {
        const trgDisplayModeElm = displayModeElmCol[0];

        if (trgDisplayModeElm) {
          if (!trgDisplayModeElm.classList.contains("display-mod-selected")) {
            if (subtitlesDisplayModeMsg.slide === "questions") {
              if (subtitlesDisplayModeMsg.clientId !== mqttClientId) {
                if (questionMqttMessage) {
                  const isTimeExceeded = determineTimeDiffExceeded(
                    questionMqttMessage,
                    qstSwapTime,
                    2
                  );

                  if (isTimeExceeded) {
                    publishSlide(questionMqttMessage, questionMqttTopic, true);
                  }
                }
              }
            }

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

  function findNextVisibleQstMsg(questionMsgCol, startIndex) {
    let retObj = null;
    let currentIndex = startIndex; // = (startIndex + 1) % questionMsgCol.length;
    const langCodeByIdx = getLangCodeByIndex(currentIndex);
    const lupQstMqttMsg = questionMsgCol[langCodeByIdx];

    if (lupQstMqttMsg && lupQstMqttMsg.visible) {
      retObj = {
        index: currentIndex,
        message: lupQstMqttMsg,
        lnagCode: langCodeByIdx,
      };
    } else {
      for (const landCode in questionMsgCol) {
        if (Object.hasOwn(questionMsgCol, landCode)) {
          const lupQstMqttMsg = questionMsgCol[questionMsgCol[landCode]];

          if (!retObj) {
            //In order to return the first message
            retObj = { index: currentIndex, message: lupQstMqttMsg };
            break;
          }

          if (lupQstMqttMsg.visible) {
            if (currentIndex === startIndex) {
              if (!retObj) {
                retObj = { index: currentIndex, message: lupQstMqttMsg };
                break;
              }
            }
          }
          currentIndex++;
        }
      }
    }

    return retObj;
  }

  useEffect(() => {
    let timeoutId;

    if (subtitlesDisplayMode === "questions") {
      timeoutId = setInterval(() => {
        publishComplexQstMsg();
      }, qstSwapTime);
    } else {
      setOtherQstColIndex(0);
      timeoutId = determineSlideTypeQuestionRounRobin();
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
    props.userAddedList,
  ]);

  const subtitleNewMessageHandling = (event, topic, newMessageJson) => {
    const lastMqttMessageJson = JSON.parse(
      sessionStorage.getItem("LastActiveSlidePublishedMessage")
    );

    if (
      !lastMqttMessageJson ||
      lastMqttMessageJson.slide !== newMessageJson.slide
    ) {
      setSubtitleMqttMessage(newMessageJson);

      sessionStorage.setItem(
        "LastActiveSlidePublishedMessage",
        JSON.stringify(newMessageJson)
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
    if (newMessageJson) {
      if (broadcastLangCode === "he") {
        let otherQstMsgArr = null;
        let newOtherQuestionMsgCol = {};
        let otherQstMsgArrStr = sessionStorage.getItem("OtherQstMsgJsonList");

        try {
          otherQstMsgArr = JSON.parse(otherQstMsgArrStr);
        } catch (error) {
          otherQstMsgArr = {};
        }

        if (typeof otherQstMsgArr !== "object") {
          otherQstMsgArr = {};
        }

        newMessageJson.isLtr =
          typeof newMessageJson.isLtr === "boolean"
            ? newMessageJson.isLtr
            : newMessageJson.lang === "he"
              ? false
              : true;

        let qstMsgColLength =
          otherQstMsgArr && otherQstMsgArr[newMessageJson.lang] ? 0 : 1;

        for (const landCode in otherQstMsgArr) {
          if (Object.hasOwn(otherQstMsgArr, landCode)) {
            const lupQstMqttMsg = otherQstMsgArr[landCode];
            newOtherQuestionMsgCol[landCode] = lupQstMqttMsg;
            qstMsgColLength++;
          }
        }

        newOtherQuestionMsgCol[newMessageJson.lang] = newMessageJson;
        setOtherQuestionMsgCol(newOtherQuestionMsgCol);
        setOtherQstMsgColLength(qstMsgColLength);

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
        otherQstMessageHandling(event, topic, newMessageJson);
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

  function determineTimeDiffExceeded(qstMqttMsg, swapTime = 0, ratio = 1) {
    const curDate = new Date();
    const qstDateUtcJs = new Date(qstMqttMsg.date);
    const dateTicketsDif = curDate.getTime() - qstDateUtcJs.getTime();
    const qstSwapTimeToReset = swapTime * ratio;
    const exceeded = dateTicketsDif > qstSwapTimeToReset;

    return exceeded;
  }

  function publishComplexQstMsg() {
    if (!questionMqttMessage) {
      return;
    }

    let isPublishOrgSlide = true;
    let newIndex = otherQstColIndex;

    if (isNaN(newIndex) || newIndex >= otherQstMsgColLength) {
      newIndex = 0;
    }

    const contextMessage = JSON.parse(JSON.stringify(questionMqttMessage));
    const isTimeExceeded = determineTimeDiffExceeded(
      contextMessage,
      qstSwapTime,
      4
    );

    if (
      !isTimeExceeded &&
      contextMessage.visible &&
      otherQuestionMsgCol &&
      otherQstMsgColLength > 0
    ) {
      let curOtherQstMsg = null;
      const otherVisbleQstMsgObj = findNextVisibleQstMsg(
        otherQuestionMsgCol,
        newIndex
      );

      if (otherVisbleQstMsgObj) {
        curOtherQstMsg = otherVisbleQstMsgObj.message;
        newIndex = otherVisbleQstMsgObj.index;
      }

      if (curOtherQstMsg) {
        if (curOtherQstMsg.visible) {
          if (contextMessage && contextMessage.clientId === mqttClientId) {
            if (curOtherQstMsg.orgSlide) {
              contextMessage.slide = contextMessage.orgSlide;
              contextMessage.lang = contextMessage.orgLang;
            } else {
              contextMessage.orgSlide = questionMqttMessage.orgSlide
                ? questionMqttMessage.orgSlide
                : questionMqttMessage.slide;
              contextMessage.orgLang = questionMqttMessage.orgLang
                ? questionMqttMessage.orgLang
                : questionMqttMessage.lang;

              contextMessage.slide = curOtherQstMsg.slide;
            }

            contextMessage.slide = `<div class="d-flex justify-content-center">${contextMessage.slide}<div>`;
            contextMessage.isLtr = curOtherQstMsg.lang === "he" ? false : true;
            publishSlide(contextMessage, questionMqttTopic, true);
            isPublishOrgSlide = false;
            setQuestionMqttMessage(contextMessage);
          }
        }
      }
    }

    if (isPublishOrgSlide) {
      if (contextMessage.visible) {
        if (
          contextMessage.orgSlide &&
          (isTimeExceeded || contextMessage.orgSlide !== contextMessage.slide)
        ) {
          contextMessage.slide = contextMessage.orgSlide;
          contextMessage.lang = contextMessage.orgLang;
          publishSlide(contextMessage, questionMqttTopic, true);
        }
      } else {
        if (!contextMessage.orgSlide) {
          contextMessage.orgSlide = contextMessage.slide;
        }

        if (contextMessage.slide) {
          contextMessage.slide = "";
          publishSlide(contextMessage, questionMqttTopic, true);
        }
      }
    }

    newIndex++;

    if (newIndex >= otherQstMsgColLength) {
      newIndex = 0;
    }

    setOtherQstColIndex(newIndex);
  }

  function getLangCodeByIndex(index) {
    let retVal = "he";

    if (index === 1) {
      retVal = "en";
    } else if (index === 2) {
      retVal = "ru";
    } else if (index === 3) {
      retVal = "es";
    }

    return retVal;
  }

  function determineSlideTypeQuestionRounRobin() {
    let timeoutId = null;

    if (props.subtitlesDisplayMode === "sources") {
      const userAddedList = props.userAddedList;
      const activatedTab = props.activatedTab;

      if (userAddedList && activatedTab >= 0) {
        const activeSlideObj = findActiveSlides(userAddedList, activatedTab);
        const activeSlide = activeSlideObj.activeSlideByLang;
        const otherSlides = activeSlideObj.otherSlides;

        if (
          activeSlide &&
          activeSlide.slide_type === "question" &&
          otherSlides &&
          otherSlides.length > 0
        ) {
          if (
            !Array.isArray(rounRobinQstMsgCol) ||
            rounRobinQstMsgCol.length === 0 ||
            rounRobinQstMsgCol.slide !== rounRobinQstMsgCol[0].slide
          ) {
            let rbMsgArr = [];
            rbMsgArr.push(activeSlide, ...otherSlides);
            setRounRobinQstMsgCol(rbMsgArr);

            timeoutId = setInterval(() => {
              const rounRobinIndexStr =
                sessionStorage.getItem("rounRobinIndex");

              let newIndex =
                typeof rounRobinIndexStr === "string" &&
                rounRobinIndexStr.length > 0
                  ? Number(rounRobinIndexStr)
                  : 0;

              if (isNaN(newIndex)) {
                newIndex = 0;
              }

              if (newIndex >= rbMsgArr.length - 1) {
                newIndex = 0;
              } else {
                newIndex++;
              }

              const slideToPublish = rbMsgArr[newIndex];
              const slideJsonMsg = publishSlide(
                slideToPublish,
                subtitleMqttTopic
              );

              setSubtitleMqttMessage(slideJsonMsg);
              sessionStorage.setItem(
                "ActiveSlideMessaging",
                JSON.stringify(slideJsonMsg)
              );

              setOtherQstColIndex(newIndex); //Doesn't work
              sessionStorage.setItem("rounRobinIndex", String(newIndex)); //Workaround
            }, qstSwapTime);
          }
        }
      }
    }

    return timeoutId;
  }
  ///####

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
              isLtr={
                typeof contextMqttMessage.isLtr === "boolean"
                  ? contextMqttMessage.isLtr
                  : typeof contextMqttMessage.left_to_right === "boolean"
                    ? props.left_to_right
                    : props.isLtr
              }
              isQuestion={
                contextMqttMessage.type === "question" ||
                contextMqttMessage.slide_type === "question"
              }
            ></Slide>
          )}
        </div>
      </div>
    </>
  );
}

export default ActiveSlideMessaging;
