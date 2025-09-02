import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActiveSlide } from "../Components/ActiveSlide";
import { useSelector } from "react-redux";
import { visibleSlideOrNull, useDeepMemo } from "../Utils/Common"
import { DM_NONE, DM_QUESTIONS, ST_QUESTION } from "../Utils/Const"
import { lastMessage } from "../Redux/MQTT/mqttSlice"
import IconButton from "@mui/material/IconButton";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit"

import "./PagesCSS/GreenWindow.css";

const GreenScreen = () => {
  const outerRef = useRef();
  const spacerRef = useRef();

  const [isFullScreen, setIsFullScreen] = useState(false);

  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode || DM_NONE,
  );
  const {
    broadcast_language_code: language,
    broadcast_program_code: channel,
  } = useSelector((state) => state.userSettings.userSettings);
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);
  const slide = useDeepMemo(visibleSlideOrNull(lastMessage(mqttMessages, subtitlesDisplayMode, language, channel)));
  const isQuestion = slide && subtitlesDisplayMode === DM_QUESTIONS && slide.slide_type === ST_QUESTION;

  const handleResize = useCallback(() => {
    const scale = outerRef.current.clientWidth / 1920;

    document.querySelectorAll('.side-menu').forEach(el => {
      el.style.display = 'none';
    });

    if (isQuestion) {
      spacerRef.current.style.height = `${scale * 796}px`;
    } else {
      spacerRef.current.style.height = `${scale * 770}px`;
    }
  }, [isQuestion]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  const handleToggle = useCallback(() => {
    if (!isFullScreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullScreen(!isFullScreen);
  }, [isFullScreen]);

  return (
    <div ref={outerRef} className="background">
			<div className="full-screen-button-parent">
				<IconButton className="full-screen-button" color="inherit" onClick={handleToggle}>
					{isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
				</IconButton>
			</div>
      <div ref={spacerRef} className="spacer"></div>
      <ActiveSlide />
    </div>
  );
};

export default GreenScreen;
