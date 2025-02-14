import React, { useEffect, useRef } from "react";
import { Slide } from "../Components/Slide";
import { publishEvent } from "../Utils/Events";
import { useSelector, useDispatch } from "react-redux";
import {
  setActiveBroadcastMessage,
  resetUserInitiatedChange,
  setSubtitlesDisplayMode,
} from "../Redux/MQTT/mqttSlice";
import {
  subtitlesDisplayModeTopic,
  getQuestionMqttTopic,
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
  const questionMqttTopic = getQuestionMqttTopic(
    broadcastProgrammCode,
    broadcastLangCode
  );
  const otherQstColIndex = useRef(0);
  const otherQstMsgColLength = Object.keys(
    subtitleRelatedQuestionMessagesList || {}
  ).length;
  // ✅ Get `clientId` from Redux
  const clientId = useSelector((state) => state.mqtt.clientId);
  // ✅ Store `clientId` in a ref to prevent unnecessary re-renders
  const clientIdRef = useRef(clientId);

  function findNextVisibleQstMsg(questionList, startIndex) {
    const keys = Object.keys(questionList);
    const length = keys.length;

    if (length === 0) {
      return null;
    }

    for (let i = 0; i < length; i++) {
      const index = (startIndex + i) % length;
      const question = questionList[keys[index]];
      if (question && question.visible) {
        return { message: question, index };
      }
    }
    return null;
  }

  useEffect(() => {
    if (!clientIdRef.current && clientId) {
      clientIdRef.current = clientId; // ✅ Ensure clientId is stored once
    }
  }, [clientId]);

  // ✅ Publish display mode to MQTT **only if it has changed**
  useEffect(() => {
    if (isUserInitiatedChange) {
      console.log("📡 Publishing display mode change:", subtitlesDisplayMode);
      dispatch(resetUserInitiatedChange());

      publishEvent("mqttPublush", {
        mqttTopic: subtitlesDisplayModeTopic,
        message: {
          type: subtitlesDisplayModeTopic,
          slide: subtitlesDisplayMode,
        },
      });
    }
  }, [subtitlesDisplayMode]);

  useEffect(() => {
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
  }, [subtitlesDisplayMode, isUserInitiatedChange]);
  // ✅ Update `activeBroadcastMessage` when the display mode changes
  useEffect(() => {
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
  }, [subtitlesDisplayMode, selectedSubtitleSlide, selectedQuestionMessage]);

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
