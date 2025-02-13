import React, { useState, useEffect } from "react";
import { broadcastLangMapObj } from "../Utils/Const";
import {
  getCurrentBroadcastProgramm,
  getQuestionMqttTopic,
} from "../Utils/Common";
import {
  publishEvent,
  subscribeEvent,
  unSubscribeEvent,
} from "../Utils/Events";
import { Slide } from "./Slide";
import { useSelector, useDispatch } from "react-redux";
import { questionMessageReceived } from "../Redux/MQTT/mqttSlice";

const QuestionMessage = (props) => {
  const dispatch = useDispatch();

  const [broadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;

  const questionMessagesList = useSelector(
    (state) => state.mqtt.questionMessagesList
  );

  const langList = props.languagesList;
  const mqttTopicList = langList.map((langItem, index) => {
    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      langItem.value
    );
    return mqttTopic;
  });

  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      mqttTopicList.forEach((mqttTopic, index) => {
        if (!subscribed) {
          subscribeEvent(mqttTopic, (event) => {
            newMessageHandling(event);
            subscribed = true;
          });
        }
      });

      subscribed = true;
    }
  };
  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent("mqttSubscribe", newMessageHandling);
    subscribed = false;
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      mqttTopicList.forEach((mqttTopic, index) => {
        publishEvent("mqttSubscribe", {
          mqttTopic: mqttTopic,
        });
      });

      compSubscribeEvents();
    });

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();

      mqttTopicList.forEach((mqttTopic, index) => {
        publishEvent("mqttUnSubscribe", {
          mqttTopic: mqttTopic,
        });
      });
    };
  }, []);

  const newMessageHandling = (event) => {
    const newMessage = event.detail.messageJson;

    if (newMessage) {
      if (!newMessage.date) {
        newMessage.date = new Date();
      }

      dispatch(questionMessageReceived(newMessage)); // ✅ Update Redux state
    }
  };

  const parseUtcStrToLocal = (utcDateStr) => {
    let retVal = utcDateStr;

    if (utcDateStr) {
      const locDate = new Date(utcDateStr);
      retVal = `Date: ${locDate.toLocaleDateString()}  Time: ${locDate.toLocaleTimeString()}`;
    }

    return retVal;
  };

  const getLanguageName = (langCode) => {
    const langName = broadcastLangMapObj[langCode].label;
    return langName;
  };
  const languageIsLtr = (langCode) => {
    let isLeftToRight = true;

    if (langCode) {
      const lnagObj = broadcastLangMapObj[langCode];

      if (lnagObj) {
        isLeftToRight = !(lnagObj.isLtr === false);
      }
    }

    return isLeftToRight;
  };

  const sendQuestionButtonClickHandler = (questionMsg) => {
    const mqttTopic = getQuestionMqttTopic(
      broadcastProgrammCode,
      questionMsg.lang
    );
    questionMsg.visible = !questionMsg.visible;
    const jsonMsgStr = JSON.stringify(questionMsg);

    publishEvent("mqttPublush", {
      mqttTopic: mqttTopic,
      message: jsonMsgStr,
    });
  };

  if (props.mode === "subtitle") {
    return (
      <>
        {[...questionMessagesList] // ✅ Copy before sorting
          .slice() // ✅ Ensures no mutation
          .sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1))
          .map((obj) => (
            <div className="QuestionSection" data-key={obj.ID} key={obj.ID}>
              <div className="d-flex h-auto p-2">
                <i
                  className={
                    obj.visible ? "bi bi-eye-fill" : "bi bi-eye-slash-fill"
                  }
                  onClick={() => sendQuestionButtonClickHandler(obj)}
                />
                <span>
                  {getLanguageName(obj.lang ? obj.lang : obj.language)}
                </span>
              </div>
              <Slide
                content={obj.orgSlide ? obj.orgSlide : obj.slide}
                isLtr={languageIsLtr(obj.lang ? obj.lang : obj.language)}
                isQuestion={obj.type === "question"}
              ></Slide>
            </div>
          ))}
      </>
    );
  } else if (props.mode === "slide") {
    return (
      <>
        {[...questionMessagesList] // ✅ Copy before sorting
          .slice() // ✅ Ensures no mutation
          .sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1))
          .map((obj) => (
            <div data-key={obj.ID} key={obj.ID} style={{ height: "200px" }}>
              <Slide
                content={obj.slide}
                isLtr={languageIsLtr(obj.lang ? obj.lang : obj.language)}
                isQuestion={
                  obj.type === "question" || obj.slide_type === "question"
                }
              ></Slide>
            </div>
          ))}
      </>
    );
  } else {
    return (
      <>
        {[...questionMessagesList] // ✅ Copy before sorting
          .slice() // ✅ Ensures no mutation
          .sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1))
          .map((obj) => (
            <div data-key={obj.ID} key={obj.ID}>
              <div>
                <li className="item">
                  <span className="datetime">
                    Date: {parseUtcStrToLocal(obj.date)}
                  </span>
                  <br />
                  <div
                    className={`message ${
                      languageIsLtr(obj.lang ? obj.lang : obj.language)
                        ? "ChangeToLtr"
                        : "ChangeToRtl"
                    }`}
                  >
                    {obj.orgSlide ? obj.orgSlide : obj.slide}
                  </div>
                </li>
                <hr />
              </div>
            </div>
          ))}
      </>
    );
  }
};

export default QuestionMessage;
