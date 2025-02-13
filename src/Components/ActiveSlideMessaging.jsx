import React, { useEffect, useRef } from "react";
import { Slide } from "../Components/Slide";
import { publishEvent } from "../Utils/Events";
import { useSelector, useDispatch } from "react-redux";
import {
  setActiveBroadcastMessage,
  resetUserInitiatedChange,
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

  // ✅ Automatically switch between questions in a round-robin style
  useEffect(() => {
    let timeoutId;

    if (subtitlesDisplayMode === "questions") {
      timeoutId = setInterval(() => {
        publishComplexQstMsg();
      }, qstSwapTime);
    } else {
      otherQstColIndex.current = 0;
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    subtitlesDisplayMode,
    subtitleRelatedQuestionMessagesList,
    selectedQuestionMessage,
  ]);
  // ✅ Publish display mode to MQTT when changed
  useEffect(() => {
    if (isUserInitiatedChange) {
      console.log("📡 Publishing display mode change:", subtitlesDisplayMode);
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

    if (
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
        if (
          contextMessage.clientId &&
          contextMessage.clientId !== clientIdRef.current
        ) {
          contextMessage.slide = curOtherQstMsg.slide;
          contextMessage.isLtr = curOtherQstMsg.lang === "he" ? false : true;

          if (
            !activeBroadcastMessage ||
            activeBroadcastMessage.slide !== contextMessage.slide
          ) {
            console.log("📡 Publishing new question message:", contextMessage);
            publishEvent("mqttPublush", {
              mqttTopic: questionMqttTopic,
              message: contextMessage,
            });
            dispatch(setActiveBroadcastMessage(contextMessage));
          }

          isPublishOrgSlide = false;
        }
      }
    }

    if (isPublishOrgSlide && contextMessage.visible) {
      if (contextMessage.clientId !== clientIdRef.current) {
        console.log("📡 Publishing original question message:", contextMessage);
        publishEvent("mqttPublush", {
          mqttTopic: questionMqttTopic,
          message: contextMessage,
        });
      }
    }

    newIndex = (newIndex + 1) % otherQstMsgColLength;
    otherQstColIndex.current = newIndex;
  }

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
