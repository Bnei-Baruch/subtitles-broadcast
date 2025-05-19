import React from "react";
import { ActiveSlide } from "../Components/ActiveSlide";
import { useSelector } from "react-redux";
import { visibleSlideOrNull, useDeepMemo } from "../Utils/Common"
import { DM_NONE, DM_QUESTIONS, ST_QUESTION } from "../Utils/Const"
import { lastMessage } from "../Redux/MQTT/mqttSlice"

export function Preview() {
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
    <div className="active-slide-msg-main-cont">
      <div className={`green-part-cont active-slide-messaging`}>
        &nbsp;
      </div>
      <div className="slide-part-cont">
        <ActiveSlide />
      </div>
      {(!slide || subtitlesDisplayMode === DM_QUESTIONS || slide.slide_type === ST_QUESTION) &&
        <div className={`green-part-cont active-slide-messaging`}>&nbsp;</div>}
    </div>
  );
}

export default Preview;
