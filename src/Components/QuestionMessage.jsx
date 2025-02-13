import React from "react";
import { useSelector } from "react-redux";
import { Slide } from "./Slide";

const QuestionMessage = () => {
  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList
  );
  const selectedLang = useSelector(
    (state) => state.BroadcastParams.broadcastLang.value
  );

  return (
    <>
      {[...(questionMessagesList[selectedLang] || [])]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((obj) => (
          <div className="QuestionSection" key={obj.ID}>
            <Slide content={obj.slide} isQuestion={obj.type === "question"} />
          </div>
        ))}
    </>
  );
};

export default QuestionMessage;
