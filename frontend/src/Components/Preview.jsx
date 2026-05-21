import React from "react";
import { ActiveSlide } from "../Components/ActiveSlide";
import { useSelector } from "react-redux";
import { visibleSlideOrNull, useDeepMemo } from "../Utils/Common"
import { DM_NONE, DM_QUESTIONS, DM_KARAOKE, ST_QUESTION } from "../Utils/Const"
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
      state.userSettings.userSettings.broadcast_program_code ||
      "morning_lesson"
  );
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const slide = useDeepMemo(visibleSlideOrNull(lastMessage(mqttMessages, subtitlesDisplayMode, broadcastLangCode, broadcastProgrammCode)));

  const isKaraoke = subtitlesDisplayMode === DM_KARAOKE;
  const karaokeMsg = isKaraoke ? lastMessage(mqttMessages, DM_KARAOKE, broadcastLangCode, broadcastProgrammCode) : null;
  const hasLiveKaraoke = karaokeMsg?.visible !== false && karaokeMsg?.slide?.trim();

  return (
    <div className="active-slide-msg-main-cont">
      <div className={`green-part-cont active-slide-messaging`}>&nbsp;</div>
      {!isKaraoke && (
        <div className="slide-part-cont">
          <ActiveSlide />
        </div>
      )}
      {isKaraoke && hasLiveKaraoke && (
        <div className="slide-part-cont">
          <ActiveSlide />
        </div>
      )}
      {((!isKaraoke && (!slide || subtitlesDisplayMode === DM_QUESTIONS || slide.slide_type === ST_QUESTION)) || (isKaraoke && !hasLiveKaraoke)) &&
        <div className={`green-part-cont active-slide-messaging`}>&nbsp;</div>}
    </div>
  );
}

export default Preview;
