import React, { useEffect, useRef } from "react";
import { Slide } from "../Components/Slide";
import { publishEvent } from "../Utils/Events";
import { useSelector, useDispatch } from "react-redux";
import {
  setActiveBroadcastMessage,
  resetUserInitiatedChange,
  setSelectedQuestionMessage,
  setRounRobinIndex,
} from "../Redux/MQTT/mqttSlice";
import {
  subtitlesDisplayModeTopic,
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

  const rounRobinIndex = useSelector((state) => state.mqtt.rounRobinIndex);
  const rounRobinIndexRef = useRef(rounRobinIndex);
  const isRoundRobinActiveRef = useRef(false);

  const userSlides = useSelector(
    (state) => state.SubtitleData?.contentList?.data?.slides
  );

  const clientId = useSelector((state) => state.mqtt.clientId);
  const clientIdRef = useRef(clientId);

  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList
  );

  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const lastSubtitleMessage = mqttMessages[subtitleMqttTopic];

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
    // ✅ Prevent resetting `activeBroadcastMessage` if round-robin is active
    if (isRoundRobinActiveRef.current) {
      console.log(
        "🛑 Skipping activeBroadcastMessage reset (Round-Robin is active)"
      );
      isRoundRobinActiveRef.current = false; // ✅ Reset round-robin flag after first cycle
      return;
    }

    // ✅ Publish selected slide to MQTT **only if display mode is "sources"** and a slide is selected and it has changed
    if (
      subtitlesDisplayMode === "sources" &&
      selectedSubtitleSlide &&
      selectedSubtitleSlide.slide &&
      broadcastLangCode && // ✅ Ensure we use the broadcast language
      (!activeBroadcastMessage ||
        activeBroadcastMessage.slide !== selectedSubtitleSlide.slide)
    ) {
      publishSlide(selectedSubtitleSlide, subtitleMqttTopic, false);
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

  useEffect(() => {
    // ✅ Update `activeBroadcastMessage` based on the current display mode and available messages
    let newActiveMessage = null;

    if (subtitlesDisplayMode === "sources") {
      newActiveMessage =
        mqttMessages[subtitleMqttTopic] ||
        selectedSubtitleSlide ||
        lastSubtitleMessage;
    } else if (subtitlesDisplayMode === "questions") {
      if (selectedQuestionMessage?.visible === false) {
        newActiveMessage = null;
      } else {
        newActiveMessage = selectedQuestionMessage;
      }
    } else if (subtitlesDisplayMode === "none") {
      newActiveMessage = null;
    }

    // ✅ Ensure updates only if the message has actually changed
    if (
      newActiveMessage &&
      activeBroadcastMessage &&
      newActiveMessage.slide === activeBroadcastMessage.slide
    ) {
      return;
    }

    console.log("📡 Updating activeBroadcastMessage:", newActiveMessage);
    dispatch(setActiveBroadcastMessage(newActiveMessage));
  }, [
    subtitlesDisplayMode,
    mqttMessages[subtitleMqttTopic], // ✅ Now tracking MQTT messages directly
    selectedSubtitleSlide,
    selectedQuestionMessage,
    activeBroadcastMessage,
    dispatch,
  ]);

  useEffect(() => {
    let timeoutId;
    rounRobinIndexRef.current = rounRobinIndex; // ✅ Ensure ref stays updated

    if (subtitlesDisplayMode === "sources" && userSlides?.length > 0) {
      const questionSlides = userSlides.filter(
        (slide) => slide.slide_type === "question"
      );

      if (questionSlides.length > 1) {
        timeoutId = setTimeout(() => {
          let nextIndex =
            (rounRobinIndexRef.current + 1) % questionSlides.length;
          let nextSlide = questionSlides[nextIndex];

          console.log("🔄 Round-Robin nextIndex:", nextIndex);
          console.log("🔄 Round-Robin nextSlide.ID:", nextSlide.ID);
          console.log(
            "🔄 Round-Robin activeBroadcastMessage?.ID:",
            activeBroadcastMessage?.ID
          );

          // ✅ Ensure the next slide is actually different
          if (nextSlide.ID !== activeBroadcastMessage?.ID) {
            console.log("🔄 Round-Robin Switching to:", nextSlide);

            isRoundRobinActiveRef.current = true;

            dispatch(setRounRobinIndex(nextIndex));
            rounRobinIndexRef.current = nextIndex; // ✅ Update ref to avoid stale values
            //dispatch(setActiveBroadcastMessage(nextSlide));

            // ✅ Publish the new question to MQTT
            publishEvent("mqttPublush", {
              mqttTopic: getSubtitleMqttTopic(
                broadcastProgrammCode,
                broadcastLangCode
              ),
              message: nextSlide,
            });
          } else {
            console.log("🔄 Skipping round-robin update (same slide)");
          }
        }, qstSwapTime);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId); // ✅ Cleanup to prevent memory leaks
      }
    };
  }, [subtitlesDisplayMode, userSlides, activeBroadcastMessage, dispatch]); // ✅ Removed `rounRobinIndex` to prevent unnecessary re-renders

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
