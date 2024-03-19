import React from "react";
import { Slide } from "./Slide";

const styles = {
  mainContainer: {
    outline: "1px solid rgb(204, 204, 204)",
    aspectRatio: "16/8",
    margin: "0 0 1px 0",
  },
  greenPartContainer: {
    backgroundColor: "green",
    height: "65%",
  },
  slidePartContainer: {
    height: "35%",
    "text-align": "left",
    padding: "0",
    margin: "0",
  },
};

export const GreenSlide = ({ isLtr, mqttMessage }) => {
  const publishedSlide = parseMqttMessage(mqttMessage);

  return (
    <div style={styles.mainContainer}>
      <div className="green-part-cont" style={styles.greenPartContainer}>
        &nbsp;{" "}
      </div>
      <div className="slide-part-cont" style={styles.slidePartContainer}>
        {publishedSlide && (
          <Slide content={publishedSlide} isLtr={isLtr}></Slide>
        )}
      </div>
    </div>
  );
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
export default GreenSlide;
