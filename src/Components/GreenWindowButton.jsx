import React, { useRef, useState } from "react";
import { GreenWindow } from "../Components/GreenWindow";
import { Slide } from "./Slide";

function getButtonClassName(showGreenWindow, isButtonDisabled) {
  var className = showGreenWindow
    ? "btn btn-success"
    : "btn btn-tr fw-bold text-success";

  if (isButtonDisabled) {
    className += " opacity-50 cursor-na";
  }

  return className;
}

function closeGreenWindowHandling(setShowGreenWindow, showGreenWindow) {
  setShowGreenWindow(!showGreenWindow);
}

const styles = {
  mainContainer: {
    height: "100%",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "70%",
  },
  slidePartContainer: {
    height: "30%",
    padding: "0",
  },
  cursorNotAllowed: {
    cursor: "not-allowed",
  },
};

function parseMqttMessage(mqttMessage) {
  if (mqttMessage) {
    try {
      let msgJson = mqttMessage;

      if (typeof mqttMessage === "string") {
        msgJson = JSON.parse(mqttMessage);
      }

      if (msgJson.slide) {
        return msgJson.slide;
      }
    } catch (err) {
      console.log(err);
    }
  }

  return mqttMessage;
}

export const GreenWindowButton = ({ isLtr, mqttMessage }) => {
  const [showGreenWindow, setShowGreenWindow] = useState(false);
  const elementRef = useRef(null);
  const publishedSlide = parseMqttMessage(mqttMessage);

  return (
    <>
      <button
        onClick={() =>
          closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)
        }
        className={getButtonClassName(showGreenWindow)}
      >
        Open Green Screen
      </button>
      {showGreenWindow && (
        <GreenWindow
          closeWinUnloadingRef={() =>
            closeGreenWindowHandling(setShowGreenWindow, showGreenWindow)
          }
        >
          <div style={styles.mainContainer}>
            <div
              className="green-part-cont"
              style={styles.greenPartContainer}
            ></div>
            <div className="slide-part-cont" style={styles.slidePartContainer}>
              {publishedSlide && (
                <Slide
                  content={publishedSlide}
                  isLtr={isLtr}
                  parentElement={elementRef}
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
