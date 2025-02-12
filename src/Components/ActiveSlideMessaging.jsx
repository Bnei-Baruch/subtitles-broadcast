import React, { useState, useEffect, useRef } from "react";
import { Slide } from "../Components/Slide";
import {
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
import { broadcastLanguages } from "../Utils/Const";
import { useSelector, useDispatch } from "react-redux";
import {
  resetUserInitiatedChange,
  setSubtitlesDisplayModeFromMQTT,
} from "../Redux/BroadcastParams/BroadcastParamsSlice";
import {
  messageReceived,
  setActiveMqttMessage,
  setSubtitleMqttMessage,
  setQuestionMqttMessage,
  addUpdateOtherQuestionMsgCol,
} from "../Redux/MQTT/mqttSlice"; // Import Redux action

const styles = {
  mainContainer: {
    outline: "1px solid rgb(204, 204, 204)",
    // aspectRatio: "16/9",
    margin: "0 0 1px 0",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "71.29%",
  },
};

export function ActiveSlideMessaging(props) {
  const dispatch = useDispatch();
  const qstSwapTime = 5000; // 5s

  const [mqttClientId] = useState(() => {
    return getMqttClientId();
  });

  const subtitleMqttMessage = useSelector((state) => {
    return state.mqtt.subtitleMqttMessage;
  });

  const questionMqttMessage = useSelector((state) => {
    return state.mqtt.questionMqttMessage;
  });

  const broadcastProgrammObj = useSelector(
    (state) => state.BroadcastParams.broadcastProgramm
  );

  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );

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

  const subtitlesDisplayMode = useSelector(
    (state) => state.BroadcastParams.subtitlesDisplayMode
  );
  // const lastSubtitlesDisplayMode = useRef(subtitlesDisplayMode);
  const isUserInitiatedChange = useSelector(
    (state) => state.BroadcastParams.isUserInitiatedChange
  );

  const activeMqttMessage = useSelector(
    (state) => state.mqtt.activeMqttMessage
  );

  const displayModeTopic = subtitlesDisplayModeTopic;
  const otherQuestionMsgCol = useSelector(
    (state) => state.mqtt.otherQuestionMsgCol
  );
  const otherQstColIndex = useRef(0); // ✅ Use `useRef()` to store index without re-renders
  const [otherQstMsgColLength, setOtherQstMsgColLength] = useState(0);

  const qstMqttTopicList = broadcastLanguages.map((langItem, index) => {
    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      langItem.value
    );
    return mqttTopic;
  });

  const findActiveSlides = (userAddedList, activeSlideOrderNum) => {
    if (
      !userAddedList ||
      !userAddedList.slides ||
      activeSlideOrderNum >= userAddedList.slides.length
    ) {
      return { activeSlideByLang: null, otherSlides: [] };
    }

    const activeSlide = userAddedList.slides[activeSlideOrderNum];

    if (!activeSlide) {
      return { activeSlideByLang: null, otherSlides: [] };
    }

    // ✅ Find all slides with the same file_uid but different languages
    const otherSlides = userAddedList.slides.filter(
      (slide) =>
        slide.slide_type === "question" &&
        slide.order_number === activeSlide.order_number &&
        slide.file_uid === activeSlide.file_uid &&
        slide.ID !== activeSlide.ID &&
        slide.slide_type === activeSlide.slide_type
    );

    return {
      activeSlideByLang: activeSlide,
      otherSlides,
    };
  };

  const publishSlide = (slide, topic, isJsonMsg, landCode) => {
    let slideJsonMsg;

    if (isJsonMsg) {
      slide.clientId = mqttClientId;
      slide.date = new Date().toUTCString();

      if (landCode) {
        slideJsonMsg.lang = landCode;
      }

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
        slide_type: slide.slide_type,
      };

      if (landCode) {
        slideJsonMsg.lang = landCode;
      }

      publishEvent("mqttPublush", {
        mqttTopic: topic,
        message: JSON.stringify(slideJsonMsg),
      });
    }

    return slideJsonMsg;
  };

  const determinePublishActiveSlide = (userAddedList, activatedTab) => {
    if (!userAddedList || !userAddedList.slides || activatedTab < 0) {
      return;
    }

    if (subtitlesDisplayMode !== "sources") {
      return;
    }

    const activeSlideObj = findActiveSlides(userAddedList, activatedTab);
    const activeSlide = activeSlideObj.activeSlideByLang;
    const otherSlides = activeSlideObj.otherSlides;

    if (!activeSlide) {
      return;
    }

    // ✅ Prevent Redux updates if the slide has not changed
    if (!activeMqttMessage || activeMqttMessage.slide !== activeSlide.slide) {
      publishSlide(activeSlide, subtitleMqttTopic, false, broadcastLangCode);
    }

    // ✅ Publish other slides only if they haven't been published before
    if (otherSlides.length > 0) {
      otherSlides.forEach((slide, index) => {
        if (!slide.languages || slide.languages.length === 0) return;

        const langIndex = (index + 1) % slide.languages.length;
        const slideLanguage = slide.languages[langIndex] || broadcastLangCode;
        const topic = getSubtitleMqttTopic(
          broadcastProgrammCode,
          slideLanguage
        );

        // ✅ Avoid duplicate publishing
        if (!activeMqttMessage || activeMqttMessage.slide !== slide.slide) {
          const slideJsonMsg = publishSlide(slide, topic, false, slideLanguage);
          dispatch(
            messageReceived({ topic: "subtitle", message: slideJsonMsg })
          );
          dispatch(addUpdateOtherQuestionMsgCol(slideJsonMsg));
        }
      });
    }
  };

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent(displayModeTopic, newMessageHandling);
      subscribeEvent(subtitleMqttTopic, newMessageHandling);

      qstMqttTopicList.forEach((mqttTopic, index) => {
        if (mqttTopic !== displayModeTopic) {
          subscribeEvent(mqttTopic, (event) => {
            newMessageHandling(event);
          });
        }
      });
    }
    subscribed = true;
  };

  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent(displayModeTopic, newMessageHandling);
    unSubscribeEvent(subtitleMqttTopic, newMessageHandling);

    qstMqttTopicList.forEach((mqttTopic, index) => {
      if (mqttTopic !== displayModeTopic) {
        unSubscribeEvent(mqttTopic, newMessageHandling);
      }
    });
  };

  useEffect(() => {
    window.onbeforeunload = function () {
      sessionStorage.removeItem("LastActiveSlidePublishedMessage");
    };

    const timeoutId = setTimeout(() => {
      publishComplexQstMsg();
    }, 500);

    // ✅ Integrate MQTT subscriptions inside the same useEffect
    publishEvent("mqttSubscribe", { mqttTopic: subtitleMqttTopic });
    publishEvent("mqttSubscribe", { mqttTopic: questionMqttTopic });
    publishEvent("mqttSubscribe", { mqttTopic: displayModeTopic });

    compSubscribeEvents(); // ✅ Ensure MQTT event subscriptions happen once

    return () => {
      window.onbeforeunload = null;
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents(); // ✅ Ensure MQTT is unsubscribed on unmount
    };
  }, []);

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
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, [subtitlesDisplayMode, subtitleMqttTopic]);

  useEffect(() => {
    updateActiveMessage();
  }, [
    subtitlesDisplayMode,
    subtitleMqttMessage,
    questionMqttMessage,
    activeMqttMessage,
    dispatch,
    updateActiveMessage,
  ]);

  function updateActiveMessage() {
    const selectedMessage =
      subtitlesDisplayMode === "sources"
        ? subtitleMqttMessage
        : subtitlesDisplayMode === "questions"
          ? questionMqttMessage
          : "";

    // ✅ Prevent unnecessary updates
    if (selectedMessage !== activeMqttMessage) {
      dispatch(setActiveMqttMessage(selectedMessage));
    }
  }

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
      otherQstColIndex.current = 0;
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

  const subtitleNewMessageHandling = (newMessageJson) => {
    if (
      !subtitleMqttMessage ||
      subtitleMqttMessage.slide !== newMessageJson.slide
    ) {
      dispatch(setSubtitleMqttMessage(newMessageJson));
      dispatch(
        setActiveMqttMessage({ topic: "subtitle", message: newMessageJson })
      );
    }
  };

  function otherQstMessageHandling(event, topic, newMessageJson) {
    if (
      !newMessageJson ||
      !newMessageJson.lang ||
      !newMessageJson.slide_type !== "question"
    ) {
      return;
    }

    // ✅ Ensure message structure is valid
    newMessageJson.isLtr =
      typeof newMessageJson.isLtr === "boolean"
        ? newMessageJson.isLtr
        : newMessageJson.lang === "he"
          ? false
          : true;

    dispatch(addUpdateOtherQuestionMsgCol(newMessageJson)); // ✅ Update Redux state
  }

  const newMessageHandling = (event) => {
    const newMessageJson = event.detail.messageJson || event.detail.message;
    const topic = event.detail.mqttTopic || event.detail.topic;

    // ✅ Clone the object before modifying
    const messageCopy = { ...newMessageJson };

    // ✅ Now it's safe to add properties
    messageCopy.dateUtcJs = new Date().toUTCString();

    switch (topic) {
      case subtitleMqttTopic:
        subtitleNewMessageHandling(messageCopy);
        break;
      case questionMqttTopic:
        dispatch(setQuestionMqttMessage(messageCopy));
        dispatch(messageReceived({ topic: "question", message: messageCopy }));
        break;
      case displayModeTopic:
        dispatch(setSubtitlesDisplayModeFromMQTT(messageCopy.slide));
        break;
      default:
        otherQstMessageHandling(event, topic, messageCopy);
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
            dispatch(
              messageReceived({ topic: "question", message: contextMessage })
            );
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

    otherQstColIndex.current = newIndex;
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
    if (subtitlesDisplayMode !== "sources") {
      return null;
    }

    const userAddedList = props.userAddedList;
    const activatedTab = props.activatedTab;

    if (!userAddedList || activatedTab < 0) {
      return null;
    }

    const activeSlideObj = findActiveSlides(userAddedList, activatedTab);
    const activeSlide = activeSlideObj.activeSlideByLang;
    const otherSlides = activeSlideObj.otherSlides;

    if (
      !activeSlide ||
      activeSlide.slide_type !== "question" ||
      otherSlides.length === 0
    ) {
      return null;
    }

    // ✅ Use Redux to store round-robin question slides
    const rbMsgArr = [activeSlide, ...otherSlides];

    // ✅ Handle round-robin logic properly
    let newIndex = Number(sessionStorage.getItem("rounRobinIndex")) || 0;
    newIndex = (newIndex + 1) % rbMsgArr.length;

    const slideToPublish = rbMsgArr[newIndex];

    if (
      !activeMqttMessage ||
      activeMqttMessage.slide !== slideToPublish.slide
    ) {
      publishSlide(slideToPublish, subtitleMqttTopic);
    }

    if (rbMsgArr.length > 1) {
      sessionStorage.setItem("rounRobinIndex", String(newIndex));
      return setTimeout(
        () => determineSlideTypeQuestionRounRobin(),
        qstSwapTime
      );
    }
  }

  useEffect(() => {
    if (isUserInitiatedChange) {
      publishSubtitlesDisplayMode(subtitlesDisplayMode);
      dispatch(resetUserInitiatedChange()); // ✅ Reset after publishing
    }
  }, [subtitlesDisplayMode, isUserInitiatedChange]);

  useEffect(() => {
    if (subtitlesDisplayMode === "sources") {
      determinePublishActiveSlide(props.userAddedList, props.activatedTab);
    }
  }, [subtitlesDisplayMode, props.userAddedList, props.activatedTab]);

  return (
    <>
      <div style={styles.mainContainer}>
        <div
          className={`green-part-cont active-slide-messaging${
            activeMqttMessage?.slide ? "" : " display-mode-none"
          }`}
        >
          &nbsp;{" "}
        </div>
        <div className="slide-part-cont">
          {activeMqttMessage?.slide && (
            <Slide
              data-key={activeMqttMessage.ID}
              key={activeMqttMessage.ID}
              content={activeMqttMessage.slide}
              isLtr={
                typeof activeMqttMessage.isLtr === "boolean"
                  ? activeMqttMessage.isLtr
                  : typeof activeMqttMessage.left_to_right === "boolean"
                    ? props.left_to_right
                    : props.isLtr
              }
              isQuestion={
                activeMqttMessage.type === "question" ||
                activeMqttMessage.slide_type === "question"
              }
            ></Slide>
          )}
        </div>
      </div>
    </>
  );
}

export default ActiveSlideMessaging;
