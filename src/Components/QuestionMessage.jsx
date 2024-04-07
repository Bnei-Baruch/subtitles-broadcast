import React, { useState, useEffect } from "react";
import {
  broadcastLanguages,
  broadcastLangMapObj,
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
} from "../Utils/Const";
import { publishEvent, subscribeEvent } from "../Utils/Events";
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
  const langList = props.languagesList
    ? props.languagesList
    : broadcastLanguages;
  const mqttTopicList = langList.map((langItem, index) => {
    const mqttTopic = `${langItem.value}_questions_${broadcastProgrammCode}`;
    return mqttTopic;
  });

  useEffect(() => {
    console.log("QuestionMessage mqttSubscribe");

    const timeoutId = setTimeout(() => {
      mqttTopicList.forEach((mqttTopic, index) => {
        publishEvent("mqttSubscribe", {
          mqttTopic: mqttTopic,
        });

        subscribeEvent(mqttTopic, (event) => {
          newMessageHandling(event);
        });

        console.log("QuestionMessage mqttSubscribe DONE", mqttTopic);
      }, 0);
    });

    return () => {
      clearTimeout(timeoutId);

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

  if (props.mode === "subtitle") {
    return (
      <>
        {notificationList
          .sort((a, b) => (a.dateUtcJs < b.dateUtcJs ? 1 : -1))
          .map((obj) => (
            <div className="QuestionSection " data-key={obj.ID} key={obj.ID}>
              <div className="d-flex justify-content-between h-auto">
                <p>{getLanguageName(obj.lang)}</p>
                <i className="bi bi-eye" />
              </div>
              <div className="d-flex justify-content-end">
                <p>{obj.slide}</p>
              </div>
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
                  <div className="message">{obj.slide}</div>
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
