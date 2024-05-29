import React, { useState, useEffect } from "react";
import {
  broadcastLangMapObj,
} from "../Utils/Const";
import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm
} from "../Utils/Common";
import {
  publishEvent,
  subscribeEvent,
  unSubscribeEvent,
} from "../Utils/Events";
import { Slide } from "./Slide";

const QuestionMessage = (props) => {
  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const [broadcastLang, setBroadcastLang] = useState(() => {
    return getCurrentBroadcastLanguage();
  });
  const broadcastLangCode = broadcastLang.value;
  const [notificationList, setNotificationList] = useState([]);
  const langList = props.languagesList;
  const mqttTopicList = langList.map((langItem, index) => {
    const mqttTopic = `${langItem.value}_questions_${broadcastProgrammCode}`;
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
          console.log("QuestionMessage mqttSubscribe DONE", mqttTopic);
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
    console.log("QuestionMessage mqttSubscribe");

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

  let notificationListTmp = notificationList;

  const newMessageHandling = (event) => {
    console.log("QuestionMessage newMessageHandling", event);
    const newMessage = event.detail.messageJson;

    const currMqttTopic = `${broadcastLangCode}_questions_${broadcastProgrammCode}`;
    if (event.detail.mqttTopic === currMqttTopic) {
      sessionStorage.setItem("currentBroadcastquestions", newMessage);
    }

    if (newMessage) {
      if (newMessage.date) {
        newMessage.dateUtcJs = new Date(newMessage.date);
        notificationListTmp = [...notificationListTmp, newMessage];
        setNotificationList(notificationListTmp);

        console.log("notificationList: ", notificationList);
        console.log("notificationListTmp: ", notificationListTmp);
      }
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

  if (props.mode === "subtitle") {
    return (
      <>
        {notificationList
          .sort((a, b) => (a.dateUtcJs < b.dateUtcJs ? 1 : -1))
          .map((obj) => (
            <div className="QuestionSection" data-key={obj.ID} key={obj.ID}>
              <div className="d-flex justify-content-between h-auto p-2">
              {getLanguageName(obj.lang)}
              </div>
               <Slide content={obj.slide} isLtr={props.isLtr}></Slide>
            </div>
          ))}
      </>
    );
  } else if (props.mode === "slide") {
    return (
      <>
        {notificationList
          .sort((a, b) => (a.dateUtcJs < b.dateUtcJs ? 1 : -1))
          .map((obj) => (
            <div data-key={obj.ID} key={obj.ID} style={{ height: "200px" }}>
              <Slide content={obj.slide} isLtr={props.isLtr}></Slide>
            </div>
          ))}
      </>
    );
  } else {
    return (
      <>
        {notificationList
          .sort((a, b) => (a.dateUtcJs < b.dateUtcJs ? 1 : -1))
          .map((obj) => (
            <div data-key={obj.ID} key={obj.ID}>
              <div>
                <li className="item">
                  <span className="datetime">
                    Date: {parseUtcStrToLocal(obj.date)}
                  </span>
                  <br />
                  <div
                    className={`message ${languageIsLtr(obj.lang) ? "ChangeToLtr" : "ChangeToRtl"
                      }`}
                  >
                    {obj.slide}
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

// QuestionMessage.propTypes = {
//   languageCode: PropTypes.string.isRequired,
// };

export default QuestionMessage;
