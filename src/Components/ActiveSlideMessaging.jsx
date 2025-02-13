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
  setActiveBroadcastMessage,
  setSelectedSubtitleSlide,
  setSelectedQuestionMessage,
  addUpdateSubtitleRelatedQuestionMessagesList,
  setRounRobinIndex,
} from "../Redux/MQTT/mqttSlice";
import debugLog from "../Utils/debugLog";

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

  const selectedSubtitleSlide = useSelector((state) => {
    return state.mqtt.selectedSubtitleSlide;
  });

  const selectedQuestionMessage = useSelector((state) => {
    return state.mqtt.selectedQuestionMessage;
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

  const activeBroadcastMessage = useSelector(
    (state) => state.mqtt.activeBroadcastMessage
  );

  const displayModeTopic = subtitlesDisplayModeTopic;
  const subtitleRelatedQuestionMessagesList = useSelector(
    (state) => state.mqtt.subtitleRelatedQuestionMessagesList
  );
  const otherQstColIndex = useRef(0); // ✅ Use `useRef()` to store index without re-renders
  const otherQstMsgColLength = Object.keys(
    subtitleRelatedQuestionMessagesList || {}
  ).length;
  // const rounRobinIndex = useSelector((state) => state.mqtt.rounRobinIndex);

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
    if (
      !activeBroadcastMessage ||
      activeBroadcastMessage.slide !== activeSlide.slide
    ) {
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
        if (
          !activeBroadcastMessage ||
          activeBroadcastMessage.slide !== slide.slide
        ) {
          const slideJsonMsg = publishSlide(slide, topic, false, slideLanguage);
          dispatch(addUpdateSubtitleRelatedQuestionMessagesList(slideJsonMsg));
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
    selectedSubtitleSlide,
    selectedQuestionMessage,
    activeBroadcastMessage,
    dispatch,
    updateActiveMessage,
  ]);

  function updateActiveMessage() {
    const selectedMessage =
      subtitlesDisplayMode === "sources"
        ? selectedSubtitleSlide
        : subtitlesDisplayMode === "questions"
          ? selectedQuestionMessage
          : "";

    // ✅ Prevent unnecessary updates
    if (selectedMessage !== activeBroadcastMessage) {
      dispatch(setActiveBroadcastMessage(selectedMessage));
    }
  }

  function findNextVisibleQstMsg(questionMsgCol, startIndex) {
    let currentIndex = startIndex;
    const totalMessages = Object.keys(questionMsgCol).length;

    if (totalMessages === 0) return null; // ✅ No messages available

    // ✅ Start searching for the next visible message
    for (let i = 0; i < totalMessages; i++) {
      const langCode = getLangCodeByIndex((currentIndex + i) % totalMessages);
      const qstMessage = questionMsgCol[langCode];

      if (qstMessage && qstMessage.visible) {
        return {
          index: (currentIndex + i) % totalMessages,
          message: qstMessage,
          langCode,
        };
      }
    }

    return null; // ✅ No visible messages found
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
    subtitleRelatedQuestionMessagesList,
    selectedQuestionMessage,
    props.userAddedList,
  ]);

  const subtitleNewMessageHandling = (newMessageJson) => {
    if (
      !selectedSubtitleSlide ||
      selectedSubtitleSlide.slide !== newMessageJson.slide
    ) {
      dispatch(setSelectedSubtitleSlide(newMessageJson));
      dispatch(
        setActiveBroadcastMessage({
          topic: "subtitle",
          message: newMessageJson,
        })
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

    dispatch(addUpdateSubtitleRelatedQuestionMessagesList(newMessageJson)); // ✅ Update Redux state
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
        dispatch(setSelectedQuestionMessage(messageCopy));
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
    if (!selectedQuestionMessage) {
      return;
    }

    let isPublishOrgSlide = true;
    let newIndex = otherQstColIndex.current;

    if (isNaN(newIndex) || newIndex >= otherQstMsgColLength) {
      newIndex = 0;
    }

    const contextMessage = JSON.parse(JSON.stringify(selectedQuestionMessage));
    const isTimeExceeded = determineTimeDiffExceeded(
      contextMessage,
      qstSwapTime,
      4
    );

    if (
      !isTimeExceeded &&
      contextMessage.visible &&
      subtitleRelatedQuestionMessagesList.length > 0
    ) {
      let curOtherQstMsg = null;
      const otherVisibleQstMsgObj = findNextVisibleQstMsg(
        subtitleRelatedQuestionMessagesList,
        newIndex
      );

      if (otherVisibleQstMsgObj) {
        curOtherQstMsg = otherVisibleQstMsgObj.message;
        newIndex = otherVisibleQstMsgObj.index;
      }

      if (curOtherQstMsg && curOtherQstMsg.visible) {
        if (contextMessage.clientId === mqttClientId) {
          if (!curOtherQstMsg.orgSlide) {
            contextMessage.orgSlide =
              selectedQuestionMessage.orgSlide || selectedQuestionMessage.slide;
            contextMessage.orgLang =
              selectedQuestionMessage.orgLang || selectedQuestionMessage.lang;
          }

          contextMessage.slide = curOtherQstMsg.slide;
          contextMessage.slide = `<div class="d-flex justify-content-center">${contextMessage.slide}<div>`;
          contextMessage.isLtr = curOtherQstMsg.lang === "he" ? false : true;

          // ✅ Prevent duplicate publishing
          if (
            !activeBroadcastMessage ||
            activeBroadcastMessage.slide !== contextMessage.slide
          ) {
            publishSlide(contextMessage, questionMqttTopic, true);
            dispatch(setSelectedQuestionMessage(contextMessage));
          }

          isPublishOrgSlide = false;
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

    newIndex = (newIndex + 1) % otherQstMsgColLength;
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

    // ✅ Create round-robin slide array
    const rbMsgArr = [activeSlide, ...otherSlides];

    // ✅ Get the current index and ensure it wraps correctly
    const rounRobinIndexStr = sessionStorage.getItem("rounRobinIndex");
    let newIndex =
      typeof rounRobinIndexStr === "string" && rounRobinIndexStr.length > 0
        ? Number(rounRobinIndexStr)
        : 0;
    newIndex = (newIndex + 1) % rbMsgArr.length;

    // ✅ Ensure `newIndex` does not get stuck
    if (isNaN(newIndex) || newIndex >= rbMsgArr.length || newIndex < 0) {
      newIndex = 0; // ✅ Reset if out of bounds
    }

    const slideToPublish = rbMsgArr[newIndex];
    debugLog("newIndex: " + newIndex);
    debugLog("slideToPublish: " + slideToPublish.slide);

    // ✅ Prevent duplicate publishing
    if (
      !activeBroadcastMessage ||
      activeBroadcastMessage.slide !== slideToPublish.slide
    ) {
      publishSlide(slideToPublish, subtitleMqttTopic);
      dispatch(setActiveBroadcastMessage(slideToPublish));
      debugLog("Slide published and dispatched");
    }

    // ✅ Ensure `rounRobinIndex` is updated correctly in Redux
    dispatch(setRounRobinIndex(newIndex));
    sessionStorage.setItem("rounRobinIndex", String(newIndex)); //Workaround
    debugLog("newIndex dispatch: " + newIndex);

    if (rbMsgArr.length > 1) {
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
            activeBroadcastMessage?.slide ? "" : " display-mode-none"
          }`}
        >
          &nbsp;{" "}
        </div>
        <div className="slide-part-cont">
          {activeBroadcastMessage?.slide && (
            <Slide
              data-key={activeBroadcastMessage.ID}
              key={activeBroadcastMessage.ID}
              content={activeBroadcastMessage.slide}
              isLtr={
                typeof activeBroadcastMessage.isLtr === "boolean"
                  ? activeBroadcastMessage.isLtr
                  : typeof activeBroadcastMessage.left_to_right === "boolean"
                    ? props.left_to_right
                    : props.isLtr
              }
              isQuestion={
                activeBroadcastMessage.type === "question" ||
                activeBroadcastMessage.slide_type === "question"
              }
            ></Slide>
          )}
        </div>
      </div>
    </>
  );
}

export default ActiveSlideMessaging;
