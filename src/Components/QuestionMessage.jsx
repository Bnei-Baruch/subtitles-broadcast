import React, { useState, useContext, useEffect } from "react";
import AppContext from "../AppContext";
import PropTypes from "prop-types";
// import mqttClientUtils, { parseMqttMessage } from "../Utils/MqttUtils";
// import useMqtt, { parseMqttMessage } from "../Utils/UseMqttUtils";
import useMqtt from "../Utils/UseMqttUtils";
import { broadcastLanguages } from "../Utils/Const";

const QuestionMessage = (props) => {
  const appContextlData = useContext(AppContext);
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  //const broadcastLangCode = appContextlData.broadcastLang.value;
  const { mqttUnSubscribe, mqttSubscribe, isConnected, payload } = useMqtt();

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
    return () => {
      mqttTopicList.forEach((mqttTopic, index) => {
        mqttUnSubscribe(mqttTopic);
      });
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      mqttTopicList.forEach((mqttTopic, index) => {
        mqttSubscribe(mqttTopic);
      });
    }
  }, [isConnected]);

  useEffect(() => {
    if (payload.message && mqttTopicList.includes(payload.topic)) {
      const newMessage = JSON.parse(payload.message);
      const notif = [...notificationList, newMessage];
      setNotificationList(notif);

      setMqttQuestion(newMessage);
      setMqttDate(newMessage.date);
      sessionStorage.setItem(
        `nqttQuestion${props.languageCode}`,
        JSON.stringify(newMessage)
      );
    }
  }, [payload]);

  const [mqttQuestion, setMqttQuestion] = useState();
  const [mqttDate, setMqttDate] = useState();

  const broadcastLangMapObj = {};
  broadcastLanguages.forEach((broadcastLangObj) => {
    broadcastLangMapObj[broadcastLangObj.value] = broadcastLangObj;
  });

  const parseUtcStrToLocal = (utcDateStr) => {
    let retVal = utcDateStr;

    if (utcDateStr) {
      const locDate = new Date(utcDateStr);
      retVal = `Date: ${locDate.toLocaleDateString()}  Time: ${locDate.toLocaleTimeString()}`;
    }

    return retVal;
  };

  if (mqttQuestion) {
    if (props.mode === "subtitle") {
      const langName = broadcastLangMapObj[props.languageCode].label;

      return (
        <div className="QuestionSection ">
          <div className="d-flex justify-content-between h-auto">
            {/* <p>{langName}</p> */}
            <i className="bi bi-eye" />
          </div>
          <div className="d-flex justify-content-end">
            1111 WWW
            {/* <p>{mqttQuestion}</p> */}
          </div>
        </div>
      );
    } else {
      return (
        <>
          {notificationList.map((obj) => (
            <div>
              <div>
                <li class="item">
                  <span class="datetime">
                    222 OOO
                    {/* Date: {parseUtcStrToLocal(mqttDate)} */}
                  </span>
                  <br />
                  <div class="message">{obj.context}</div>
                </li>
                <hr />
              </div>
            </div>
          ))}
        </>
      );
    }
  } else {
    return <></>;
  }
};

// QuestionMessage.propTypes = {
//   languageCode: PropTypes.string.isRequired,
// };

export default QuestionMessage;
