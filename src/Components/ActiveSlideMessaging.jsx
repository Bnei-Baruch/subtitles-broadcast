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
  updateSubtitlesDisplayMode,
} from "../Redux/MQTT/mqttSlice";
import { getSubtitleMqttTopic } from "../Utils/Common";
import debugLog from "../Utils/debugLog";

export function ActiveSlideMessaging() {
  const dispatch = useDispatch();
  const qstSwapTime = 10000;

  const selectedSubtitleSlide = useSelector(
    (state) => state.mqtt.selectedSubtitleSlide,
    (prev, next) => prev?.ID === next?.ID
  );

  const selectedQuestionMessage = useSelector(
    (state) => state.mqtt.selectedQuestionMessage
  );

  const activeBroadcastMessage = useSelector(
    (state) => state.mqtt.activeBroadcastMessage
  );

  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode
  );

  const isUserInitiatedChange = useSelector(
    (state) => state.mqtt.isUserInitiatedChange
  );

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );

  const subtitleMqttTopic = getSubtitleMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );

  const rounRobinIndex = useSelector((state) => state.mqtt.rounRobinIndex);
  const rounRobinIndexRef = useRef(rounRobinIndex);
  const isRoundRobinActiveRef = useRef(false);

  const userSlides = useSelector(
    (state) => state.SubtitleData?.contentList?.data?.slides
  );

  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList
  );

  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);

  /** Publishes MQTT message */
  const publishMqttMessage = (topic, message) => {
    publishEvent("mqttPublush", { mqttTopic: topic, message });
  };

  /** Publishes slide to MQTT */
  const publishSlide = (slide) => {
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

    publishMqttMessage(subtitleMqttTopic, slideJsonMsg);
  };

  const getDisplayModeByMsgType = (message) => {
    return message?.type === "subtitle"
      ? "sources"
      : message?.type === "question"
        ? "questions"
        : "none";
  };

  const getMsgTypeByDisplayMode = (displayMode) => {
    return displayMode === "sources"
      ? "subtitle"
      : displayMode === "questions"
        ? "question"
        : "none";
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
      broadcastLangCode
    );

    let newActiveMessage = mqttMessages[subtitleMqttTopic];
    if (!newActiveMessage) {
      if (!activeBroadcastMessage || activeBroadcastMessage.type !== "none") {
        debugLog("No active message found. Setting to default...");
        newActiveMessage = {
          type: getMsgTypeByDisplayMode(subtitlesDisplayMode),
          slide: "",
        };
      } else {
        return;
      }
    }

    const msgSubtitlesDisplayMode = getDisplayModeByMsgType(newActiveMessage);

    if (subtitlesDisplayMode !== msgSubtitlesDisplayMode) {
      dispatch(updateSubtitlesDisplayMode(msgSubtitlesDisplayMode));
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

    if (
      !activeBroadcastMessage ||
      activeBroadcastMessage.type !== "none" ||
      activeBroadcastMessage.slide !== ""
    ) {
      publishMqttMessage(subtitleMqttTopic, { type: "none", slide: "" });
    }

    dispatch(resetUserInitiatedChange());
  }, [
    subtitlesDisplayMode,
    isUserInitiatedChange,
    activeBroadcastMessage,
    dispatch,
  ]);

  /** Publishes selected slide when display mode is "sources" */
  useEffect(() => {
    if (isRoundRobinActiveRef.current) {
      isRoundRobinActiveRef.current = false;
      return;
    }

    if (!isUserInitiatedChange) return;

    if (
      subtitlesDisplayMode === "sources" &&
      selectedSubtitleSlide &&
      broadcastLangCode &&
      (!activeBroadcastMessage ||
        activeBroadcastMessage.slide !== selectedSubtitleSlide.slide)
    ) {
      publishSlide(selectedSubtitleSlide);
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
      debugLog("Updating selectedQuestionMessage for", broadcastLangCode);
      dispatch(
        setSelectedQuestionMessage(questionMessagesList[broadcastLangCode])
      );
    }
  }, [broadcastLangCode, questionMessagesList, dispatch]);

  /** Publishes selected question message when display mode is "questions" */
  useEffect(() => {
    if (!isUserInitiatedChange || subtitlesDisplayMode !== "questions") return;

    const newActiveMessage = selectedQuestionMessage?.visible
      ? { ...selectedQuestionMessage }
      : { type: "question", slide: "" };

    if (
      activeBroadcastMessage?.slide !== selectedQuestionMessage?.slide ||
      activeBroadcastMessage?.visible !== selectedQuestionMessage?.visible
    ) {
      publishMqttMessage(subtitleMqttTopic, newActiveMessage);
    }

    dispatch(resetUserInitiatedChange());
  }, [
    subtitlesDisplayMode,
    selectedQuestionMessage,
    isUserInitiatedChange,
    activeBroadcastMessage,
    dispatch,
  ]);

  /** Implements round-robin for questions */
  useEffect(() => {
    let timeoutId;
    rounRobinIndexRef.current = rounRobinIndex;

    if (subtitlesDisplayMode === "sources" && userSlides?.length > 0) {
      const questionSlides = userSlides.filter(
        (slide) => slide.slide_type === "question"
      );

      if (questionSlides.length > 1) {
        timeoutId = setTimeout(() => {
          let nextIndex =
            (rounRobinIndexRef.current + 1) % questionSlides.length;
          let nextSlide = questionSlides[nextIndex];

          if (nextSlide.ID !== activeBroadcastMessage?.ID) {
            isRoundRobinActiveRef.current = true;
            dispatch(setRounRobinIndex(nextIndex));
            publishMqttMessage(subtitleMqttTopic, nextSlide);
          }
        }, qstSwapTime);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [subtitlesDisplayMode, userSlides, activeBroadcastMessage, dispatch]);

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
            isQuestion={activeBroadcastMessage.type === "question"}
          />
        )}
      </div>
    </div>
  );
}

export default ActiveSlideMessaging;
