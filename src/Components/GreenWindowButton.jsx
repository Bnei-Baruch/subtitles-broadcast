import React, { useState } from "react";
import { GreenWindow } from "../Components/GreenWindow";
import { ActiveSlide } from "./ActiveSlide";

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
              className={`green-part-cont`}
            ></div>
            <div
              className={`slide-part-cont`}
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
