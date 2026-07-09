import React from "react";
import { ActiveSlide } from "../Components/ActiveSlide";
import { DisconnectedBanner } from "../Components/DisconnectedBanner";
import { useSelector } from "react-redux";
import { DM_NONE, DM_QUESTIONS, DM_KARAOKE } from "../Utils/Const"

export function Preview() {
  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode || DM_NONE,
  );

  // The top green band shows in every mode. The bottom band is only for
  // questions and karaoke (a subtitle sits at the bottom, with no band below it).
  const showBottomGreen = subtitlesDisplayMode === DM_KARAOKE || subtitlesDisplayMode === DM_QUESTIONS;

  return (
    <div className="active-slide-msg-main-cont">
      <DisconnectedBanner />
      <div className={`green-part-cont active-slide-messaging`}>&nbsp;</div>
      <div className="slide-part-cont">
        <ActiveSlide />
      </div>
      {showBottomGreen && <div className={`green-part-cont active-slide-messaging`}>&nbsp;</div>}
    </div>
  );
}

export default Preview;
