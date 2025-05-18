import React, { useState } from "react";
import { useSelector } from "react-redux";
import { GreenWindow } from "../Components/GreenWindow";
import { ActiveSlide } from "./ActiveSlide";
import { DM_NONE } from "../Utils/Const"
import { visibleSlideOrNull, useDeepMemo } from "../Utils/Common"
import { lastMessage } from "../Redux/MQTT/mqttSlice"

function getButtonClassName(showGreenWindow) {
  return showGreenWindow
    ? "btn btn-success"
    : "btn btn-tr fw-bold text-success";
}

const styles = {
  mainContainer: {
    height: "100%",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "71.29%",
  },
  slidePartContainer: {
    padding: "0",
  },
  cursorNotAllowed: {
    cursor: "not-allowed",
  },
};

export const GreenWindowButton = (props) => {
  const [showGreenWindow, setShowGreenWindow] = useState(false);

  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode || DM_NONE,
  );
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_programm_code ||
      "morning_lesson"
  );
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const slide = useDeepMemo(visibleSlideOrNull(lastMessage(mqttMessages, subtitlesDisplayMode, broadcastLangCode, broadcastProgrammCode)));

  return (
    <>
      <button
        disabled={props.isLoading}
        onClick={() => setShowGreenWindow(!showGreenWindow)}
        className={getButtonClassName(showGreenWindow)}
      >
        Green Screen
      </button>

      {showGreenWindow && (
        <GreenWindow closeWinUnloadingRef={() => setShowGreenWindow(false)}>
          <div style={styles.mainContainer}>
            <div
              className={`green-part-cont${slide && slide.slide ? "" : " display-mode-none"}`}
            ></div>
            <div
              className={`slide-part-cont${slide && slide.slide ? "" : " display-mode-none"}`}
              style={styles.slidePartContainer}
            >
              <ActiveSlide isGreenWindow={true} />
            </div>
          </div>
        </GreenWindow>
      )}
    </>
  );
};

export default GreenWindowButton;
