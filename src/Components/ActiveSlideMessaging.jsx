import React, { useEffect, useRef } from "react";
import { Slide } from "../Components/Slide";
import { publishEvent } from "../Utils/Events";
import { useSelector, useDispatch } from "react-redux";
import {
  resetUserInitiatedChange,
  setSelectedQuestionMessage,
  setRounRobinIndex,
  setActiveBroadcastMessage,
  resetMqttLoading,
  setRoundRobinOff,
  setRoundRobinOn,
} from "../Redux/MQTT/mqttSlice";
import { getSubtitleMqttTopic, getQuestionMqttTopic } from "../Utils/Common";
import { broadcastLanguages } from "../Utils/Const";

export function ActiveSlideMessaging() {
  const dispatch = useDispatch();
  const qstSwapTime = 10000;

  const selectedSubtitleSlide = useSelector(
    (state) => state.mqtt.selectedSubtitleSlide,
    (prev, next) => prev?.ID === next?.ID,
  );

  const selectedQuestionMessage = useSelector(
    (state) => state.mqtt.selectedQuestionMessage,
  );

  const activeBroadcastMessage = useSelector(
    (state) => state.mqtt.activeBroadcastMessage,
  );

  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode || "none",
  );

  const isUserInitiatedChange = useSelector(
    (state) => state.mqtt.isUserInitiatedChange,
  );

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he",
  );

  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson",
  );

  const subtitleMqttTopic = getSubtitleMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode,
  );

  const rounRobinIndex = useSelector((state) => state.mqtt.rounRobinIndex);
  const rounRobinIndexRef = useRef(rounRobinIndex);
  const isRoundRobinOn = useSelector((state) => state.mqtt.isRoundRobinOn);

  const userSlides = useSelector(
    (state) => state.SubtitleData?.contentList?.data?.slides,
  );

  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList,
  );

  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);

  const publishMqttMessage = (topic, message, displayMode) => {
    message.display_status = displayMode;
    publishEvent("mqttPublish", { mqttTopic: topic, message: message });
  };

  const publishDisplyNoneMqttMessage = (topic) => {
    const newMessage = { type: "none", slide: "" };
    publishMqttMessage(topic, newMessage, "none");
  };

  const publishQuestionMqttMessage = (topic, message, displayMode) => {
    if (message) {
      const newMessage = { ...message };
      publishMqttMessage(topic, newMessage, displayMode);
    }
  };

  function RepublishQuestion(programmCode, langCode, displayMode) {
    const questionMqttTopic = getQuestionMqttTopic(programmCode, langCode);
    const curMqttMessages = mqttMessages[questionMqttTopic];

    if (!curMqttMessages || curMqttMessages.display_status !== displayMode) {
      publishQuestionMqttMessage(
        questionMqttTopic,
        curMqttMessages,
        displayMode,
      );
    }
  }

  const publishSlide = (slide, topic, displayMode) => {
    const slideJsonMsg = {
      type: "subtitle",
      ID: slide.ID,
      bookmark_id: slide.bookmark_id,
      file_uid: slide.file_uid,
      order_number: slide.order_number,
      slide: slide.slide,
      source_uid: slide.source_uid,
      isLtr: slide.left_to_right !== false,
      slide_type: slide.slide_type,
    };

    publishMqttMessage(topic, slideJsonMsg, displayMode);
  };

  /**
   * Updates the active broadcast message when switching languages.
   * If no active message exists for the new language, it sets a default empty message.
   * Also ensures subtitlesDisplayMode is updated based on the mqttMessages[subtitleMqttTopic].
   */
  useEffect(() => {
    if (!broadcastLangCode) return;

    const subtitleMqttTopic = getSubtitleMqttTopic(
      broadcastProgrammCode,
      broadcastLangCode,
    );

    let newActiveMessage = mqttMessages[subtitleMqttTopic];
    if (!newActiveMessage) {
      if (!activeBroadcastMessage || activeBroadcastMessage.type !== "none") {
        newActiveMessage = {
          type: subtitlesDisplayMode,
          slide: "",
        };
      } else {
        return;
      }
    }

    if (activeBroadcastMessage?.slide !== newActiveMessage.slide) {
      dispatch(setActiveBroadcastMessage(newActiveMessage));
    }

    dispatch(resetMqttLoading());
  }, [
    broadcastLangCode,
    mqttMessages,
    broadcastProgrammCode,
    subtitlesDisplayMode,
    activeBroadcastMessage,
    dispatch,
  ]);

  /** Handles publishing "none" message when display mode is "none" */
  useEffect(() => {
    if (!isUserInitiatedChange || subtitlesDisplayMode !== "none") return;

    if (!activeBroadcastMessage || activeBroadcastMessage.slide !== "") {
      publishDisplyNoneMqttMessage(subtitleMqttTopic);
      RepublishQuestion(broadcastProgrammCode, broadcastLangCode, "none");
    }

    dispatch(resetUserInitiatedChange());
  }, [
    subtitlesDisplayMode,
    isUserInitiatedChange,
    activeBroadcastMessage,
    dispatch,
  ]);

  /** Publishes selected slide when display mode is "subtitles" */
  useEffect(() => {
    if (!isUserInitiatedChange) return;
    if (subtitlesDisplayMode !== "subtitles") return;
    if (isRoundRobinOn) return;

    if (
      selectedSubtitleSlide &&
      broadcastLangCode &&
      (!activeBroadcastMessage ||
        activeBroadcastMessage.slide !== selectedSubtitleSlide.slide)
    ) {
      publishSlide(
        selectedSubtitleSlide,
        subtitleMqttTopic,
        subtitlesDisplayMode,
      );

      RepublishQuestion(
        broadcastProgrammCode,
        broadcastLangCode,
        subtitlesDisplayMode,
      );
    }
  }, [
    selectedSubtitleSlide,
    subtitlesDisplayMode,
    activeBroadcastMessage,
    isUserInitiatedChange,
  ]);

  /** Updates selected question message */
  useEffect(() => {
    if (broadcastLangCode && questionMessagesList[broadcastLangCode]) {
      dispatch(
        setSelectedQuestionMessage(questionMessagesList[broadcastLangCode]),
      );
    }
  }, [broadcastLangCode, questionMessagesList, dispatch]);

  /** Publishes selected question message when display mode is "questions" */
  useEffect(() => {
    if (!isUserInitiatedChange || subtitlesDisplayMode !== "questions") return;
    if (isRoundRobinOn) return;

    const newActiveMessage = selectedQuestionMessage?.visible
      ? { ...selectedQuestionMessage }
      : { type: "question", slide: "" };

    if (
      activeBroadcastMessage?.slide !== selectedQuestionMessage?.slide ||
      activeBroadcastMessage?.visible !== selectedQuestionMessage?.visible
    ) {
      RepublishQuestion(
        broadcastProgrammCode,
        broadcastLangCode,
        subtitlesDisplayMode,
      );

      publishMqttMessage(
        subtitleMqttTopic,
        newActiveMessage,
        subtitlesDisplayMode,
      );
    }

    dispatch(resetUserInitiatedChange());
  }, [
    subtitlesDisplayMode,
    selectedQuestionMessage,
    isUserInitiatedChange,
    activeBroadcastMessage,
    dispatch,
  ]);

  /** Implements round-robin*/
  useEffect(() => {
    let timeoutId;
    if (broadcastLangCode !== "he" || subtitlesDisplayMode === "none") return;

    rounRobinIndexRef.current = rounRobinIndex;

    if (subtitlesDisplayMode === "subtitles" && userSlides?.length > 0) {
      const questionSlides = userSlides.filter(
        (slide) => slide.order_number === selectedSubtitleSlide.order_number,
      );

      if (questionSlides.length > 1) {
        timeoutId = setTimeout(() => {
          let nextIndex =
            (rounRobinIndexRef.current + 1) % questionSlides.length;
          let nextSlide = questionSlides[nextIndex];

          if (nextSlide.ID !== activeBroadcastMessage?.ID) {
            dispatch(setRoundRobinOn());
            dispatch(setRounRobinIndex(nextIndex));
            publishSlide(nextSlide, subtitleMqttTopic, subtitlesDisplayMode);
          }
        }, qstSwapTime);
      }
    }

    if (subtitlesDisplayMode === "questions" && questionMessagesList) {
      const languages = Object.keys(questionMessagesList);
      const availableLanguages = broadcastLanguages
        .filter((lang) => questionMessagesList[lang.value])
        .sort((a, b) => a.order_num - b.order_num);

      const visibleQuestions = availableLanguages.filter(
        (lang) => questionMessagesList[lang.value]?.visible !== false,
      );

      if (visibleQuestions.length === 0) {
        dispatch(setRoundRobinOff());
        return;
      }

      if (availableLanguages.length > 1) {
        dispatch(setRoundRobinOn());

        timeoutId = setTimeout(() => {
          let nextIndex = rounRobinIndexRef.current;

          do {
            nextIndex = (nextIndex + 1) % languages.length;
          } while (
            questionMessagesList[availableLanguages[nextIndex]?.value]
              ?.visible === false
          );

          let nextLang = availableLanguages[nextIndex].value;
          let nextQuestion = questionMessagesList[nextLang];

          if (
            nextQuestion &&
            nextQuestion.slide !== activeBroadcastMessage?.slide
          ) {
            dispatch(setRoundRobinOn());
            dispatch(setRounRobinIndex(nextIndex));
            publishMqttMessage(
              subtitleMqttTopic,
              nextQuestion,
              subtitlesDisplayMode,
            );
          }
        }, qstSwapTime);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    subtitlesDisplayMode,
    userSlides,
    activeBroadcastMessage,
    questionMessagesList,
    dispatch,
  ]);

  return (
    <div className="active-slide-msg-main-cont">
      <div
        className={`green-part-cont active-slide-messaging${activeBroadcastMessage?.slide ? "" : " display-mode-none"}`}
      >
        &nbsp;
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
                : true
            }
            isQuestion={
              activeBroadcastMessage.slide_type === "question" ||
              activeBroadcastMessage.type === "question"
            }
          />
        )}
      </div>
    </div>
  );
}

export default ActiveSlideMessaging;
