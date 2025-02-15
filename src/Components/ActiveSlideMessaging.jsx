import React, { useEffect, useRef } from "react";
import { Slide } from "../Components/Slide";
import { publishEvent } from "../Utils/Events";
import { useSelector, useDispatch } from "react-redux";
import {
  setActiveBroadcastMessage,
  resetUserInitiatedChange,
  setSelectedQuestionMessage,
} from "../Redux/MQTT/mqttSlice";
import {
  subtitlesDisplayModeTopic,
  getQuestionMqttTopic,
  getSubtitleMqttTopic,
} from "../Utils/Common";

const styles = {
  mainContainer: {
    outline: "1px solid rgb(204, 204, 204)",
    margin: "0 0 1px 0",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "71.29%",
  },
};

export function ActiveSlideMessaging() {
  const dispatch = useDispatch();
  const qstSwapTime = 5000; // 5s

  const selectedSubtitleSlide = useSelector(
    (state) => state.mqtt.selectedSubtitleSlide
  );
  const selectedQuestionMessage = useSelector(
    (state) => state.mqtt.selectedQuestionMessage
  );
  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode
  );
  const isUserInitiatedChange = useSelector(
    (state) => state.mqtt.isUserInitiatedChange
  );
  const activeBroadcastMessage = useSelector(
    (state) => state.mqtt.activeBroadcastMessage
  );
  const subtitleRelatedQuestionMessagesList = useSelector(
    (state) => state.mqtt.subtitleRelatedQuestionMessagesList
  );
  const broadcastProgrammCode = useSelector(
    (state) => state.BroadcastParams.broadcastProgramm.value
  );
  const broadcastLangCode = useSelector(
    (state) => state.BroadcastParams.broadcastLang.value
  );

  const subtitleMqttTopic = getSubtitleMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );

  const questionMqttTopic = getQuestionMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );

  // ✅ Get `clientId` from Redux
  const clientId = useSelector((state) => state.mqtt.clientId);
  // ✅ Store `clientId` in a ref to prevent unnecessary re-renders
  const clientIdRef = useRef(clientId);

  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList
  );

  const publishSlide = (slide, topic, isJsonMsg) => {
    let slideJsonMsg;

    if (!isJsonMsg) {
      slideJsonMsg = {
        type: "subtitle",
        ID: slide.ID,
        bookmark_id: slide.bookmark_id,
        file_uid: slide.file_uid,
        order_number: slide.order_number,
        slide: slide.slide,
        source_uid: slide.source_uid,
        isLtr: slide.left_to_right === false ? false : true,
        slide_type: slide.slide_type,
      };
    }

    publishEvent("mqttPublush", {
      mqttTopic: topic,
      message: slideJsonMsg,
    });

    return slideJsonMsg;
  };

  useEffect(() => {
    if (!clientIdRef.current && clientId) {
      clientIdRef.current = clientId; // ✅ Ensure clientId is stored once
    }
  }, [clientId]);

  useEffect(() => {
    // ✅ Publish display mode to MQTT **only if it has changed**
    if (isUserInitiatedChange) {
      publishEvent("mqttPublush", {
        mqttTopic: subtitlesDisplayModeTopic,
        message: {
          type: subtitlesDisplayModeTopic,
          slide: subtitlesDisplayMode,
        },
      });
      dispatch(resetUserInitiatedChange());
    }
  }, [subtitlesDisplayMode, isUserInitiatedChange, dispatch]);

  useEffect(() => {
    // ✅ Update `activeBroadcastMessage` when the display mode changes
    let newActiveMessage = null;

    if (subtitlesDisplayMode === "sources") {
      newActiveMessage = selectedSubtitleSlide;
    } else if (subtitlesDisplayMode === "questions") {
      newActiveMessage = selectedQuestionMessage;
    } else if (subtitlesDisplayMode === "none") {
      newActiveMessage = null;
    }

    // ✅ If both are `null`, do nothing
    if (newActiveMessage === null && activeBroadcastMessage === null) {
      return; // ✅ Avoid unnecessary dispatches
    }

    // ✅ If both are not null but have the same slide, do nothing
    if (
      newActiveMessage !== null &&
      activeBroadcastMessage !== null &&
      newActiveMessage.slide === activeBroadcastMessage.slide
    ) {
      return; // ✅ Avoid unnecessary updates
    }

    console.log("📡 Updating activeBroadcastMessage:", newActiveMessage);
    dispatch(setActiveBroadcastMessage(newActiveMessage));
  }, [
    subtitlesDisplayMode,
    selectedSubtitleSlide,
    selectedQuestionMessage,
    activeBroadcastMessage,
    dispatch,
  ]);

  useEffect(() => {
    // ✅ Publish selected slide to MQTT **only if display mode is "sources"** and a slide is selected and it has changed
    if (
      subtitlesDisplayMode === "sources" &&
      selectedSubtitleSlide &&
      selectedSubtitleSlide.slide &&
      broadcastLangCode && // ✅ Ensure we use the broadcast language
      (!activeBroadcastMessage ||
        activeBroadcastMessage.slide !== selectedSubtitleSlide.slide)
    ) {
      const updateMsg = publishSlide(
        selectedSubtitleSlide,
        subtitleMqttTopic,
        false
      );

      dispatch(setActiveBroadcastMessage(updateMsg));
    }
  }, [
    selectedSubtitleSlide,
    subtitlesDisplayMode,
    broadcastProgrammCode,
    broadcastLangCode,
    activeBroadcastMessage,
    dispatch,
    subtitleMqttTopic,
  ]);

  useEffect(() => {
    // ✅ Update selected question message when the broadcast language changes or the question messages list is updated
    if (broadcastLangCode && questionMessagesList[broadcastLangCode]) {
      console.log("📡 Updating selectedQuestionMessage for", broadcastLangCode);
      dispatch(
        setSelectedQuestionMessage(questionMessagesList[broadcastLangCode])
      );
    }
  }, [broadcastLangCode, questionMessagesList, dispatch]);

  return (
    <div style={styles.mainContainer}>
      <div
        className={`green-part-cont active-slide-messaging${
          activeBroadcastMessage?.slide ? "" : " display-mode-none"
        }`}
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
