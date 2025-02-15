import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { GreenWindow } from "../Components/GreenWindow";
import { Slide } from "./Slide";

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
  const elementRef = useRef(null);
  const [showGreenWindow, setShowGreenWindow] = useState(false);

  // ✅ Use Redux state instead of local state
  const activeBroadcastMessage = useSelector(
    (state) => state.mqtt.activeBroadcastMessage
  );

  return (
    <>
      <button
        onClick={() => setShowGreenWindow(!showGreenWindow)}
        className={getButtonClassName(showGreenWindow)}
      >
        Green Screen
      </button>

      {showGreenWindow && (
        <GreenWindow closeWinUnloadingRef={() => setShowGreenWindow(false)}>
          <div style={styles.mainContainer}>
            <div
              className={`green-part-cont${
                !activeBroadcastMessage || !activeBroadcastMessage.slide
                  ? " display-mode-none"
                  : ""
              }`}
            ></div>
            <div
              className={`slide-part-cont${
                !activeBroadcastMessage || !activeBroadcastMessage.slide
                  ? " display-mode-none"
                  : ""
              }`}
              style={styles.slidePartContainer}
            >
              {activeBroadcastMessage?.slide && (
                <Slide
                  content={
                    activeBroadcastMessage.slide
                      ? activeBroadcastMessage.slide
                      : activeBroadcastMessage.context
                  }
                  parentElement={elementRef}
                  isLtr={
                    typeof activeBroadcastMessage.isLtr === "boolean"
                      ? activeBroadcastMessage.isLtr
                      : typeof activeBroadcastMessage.left_to_right ===
                          "boolean"
                        ? activeBroadcastMessage.left_to_right
                        : props.isLtr
                  }
                  isQuestion={
                    activeBroadcastMessage.type === "question" ||
                    activeBroadcastMessage.slide_type === "question"
                  }
                ></Slide>
              )}
            </div>
          </div>
        </GreenWindow>
      )}
    </>
  );
};

export default GreenWindowButton;
