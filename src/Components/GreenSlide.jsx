import React from "react";
import { Slide } from "./Slide";

const styles = {
  greenPartContainer: {
    backgroundColor: "green",
    height: "260px",
  },
  slidePartContainer: {
    height: "105px",
    "text-align": "left",
    padding: "5px 5px 5px 5px",
    margin: "0 0 15px 0",
  },
};

export const GreenSlide = ({ isLtr, mqttMessage }) => {
  const publishedSlide = parseMqttMessage(mqttMessage);

  return (
    <div style={{ outline: "1px solid rgb(204, 204, 204)" }}>
      <div className="green-part-cont" style={styles.greenPartContainer}></div>
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
