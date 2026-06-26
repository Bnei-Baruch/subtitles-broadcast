import React from "react";
import { ActiveSlide } from "../Components/ActiveSlide";
import { useSelector } from "react-redux";
import { DM_NONE, DM_QUESTIONS, DM_KARAOKE } from "../Utils/Const"
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

  const isKaraoke = subtitlesDisplayMode === DM_KARAOKE;
  const karaokeMsg = isKaraoke ? lastMessage(mqttMessages, DM_KARAOKE, broadcastLangCode, broadcastProgrammCode) : null;
  const hasLiveKaraoke = karaokeMsg?.visible !== false && karaokeMsg?.slide?.trim();

  // The top green band shows in every mode. The bottom band is only for
  // questions and karaoke (a subtitle sits at the bottom, with no band below it).
  const showBottomGreen = isKaraoke || subtitlesDisplayMode === DM_QUESTIONS;

  return (
    <div className="active-slide-msg-main-cont">
      <div className={`green-part-cont active-slide-messaging`}>&nbsp;</div>
      {(!isKaraoke || hasLiveKaraoke) && (
        <div className="slide-part-cont">
          <ActiveSlide />
        </div>
      )}
      {showBottomGreen && <div className={`green-part-cont active-slide-messaging`}>&nbsp;</div>}
    </div>
  );
}

export default Preview;
