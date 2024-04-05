import React, { useState, useEffect } from "react";
// import PropTypes from "prop-types";
import {
  broadcastLanguages,
  brodcastProgrammArr,
  broadcastLangMapObj,
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
  parseMqttMessage,
} from "../Utils/Const";
import {
  publishEvent,
  subscribeEvent,
  unsubscribeEvent,
} from "../Utils/Events";

const QuestionMessage = (props) => {
  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;

  const [broadcastLang, setBroadcastLang] = useState(() => {
    return getCurrentBroadcastLanguage();
  });

  const [notificationList, setNotificationList] = useState([]);
  const langList = props.languagesList
    ? props.languagesList
    : broadcastLanguages;
  const mqttTopicList = langList.map((langItem, index) => {
    //'he_questions_morning_lesson'
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

  let notificationListTmp = [];

  const newMessageHandling = (event) => {
    console.log("QuestionMessage newMessageHandling", event);
    const clientId = event.detail.clientId;
    const newMessage = event.detail.messageJson;

    if (newMessage && newMessage.clientId !== clientId) {
      if (newMessage.date) {
        newMessage.dateUtcJs = new Date(newMessage.date);
      }
      //const notif = [...notificationList, newMessage];
      notificationListTmp = [...notificationListTmp, newMessage];

      //notificationListTmp.sort((a, b) => (a.dateUtcJs < b.dateUtcJs ? 1 : -1))

      setNotificationList(notificationListTmp);
      //setJobMqttMessage(newMessage);
    }
  };

  // const [mqttQuestion, setMqttQuestion] = useState();
  // const [mqttDate, setMqttDate] = useState();

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
                <p>{obj.context}</p>
              </div>
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
                  <div className="message">{obj.context}</div>
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
