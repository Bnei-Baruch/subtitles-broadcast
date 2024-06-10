import React, { useState, useEffect } from "react";
import {
  broadcastLangMapObj,
} from "../Utils/Const";
import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
  getQuestionMqttTopic,
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
    const mqttTopic = getQuestionMqttTopic(broadcastProgrammCode, langItem.value) ;
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
          // console.log("QuestionMessage mqttSubscribe DONE", mqttTopic);
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
    // console.log("QuestionMessage mqttSubscribe");

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
    // console.log("QuestionMessage newMessageHandling", event);
    const newMessage = event.detail.messageJson;
    const currMqttTopic = getQuestionMqttTopic(broadcastProgrammCode, broadcastLangCode);

    if (event.detail.mqttTopic === currMqttTopic) {
      sessionStorage.setItem("currentBroadcastquestions", newMessage);
    }

    if (newMessage) {
      if (newMessage.date) {
        const msgExistObj = isMessageExist(newMessage, notificationListTmp);
        
        if (msgExistObj.isExit){
          if (msgExistObj.message.visible !==  newMessage.visible){
            msgExistObj.message.visible = newMessage.visible? true: false;
            newMessage.dateUtcJs = new Date(newMessage.date);
            notificationListTmp = [...notificationListTmp];
            setNotificationList(notificationListTmp);
          }
        }
        else{
          newMessage.dateUtcJs = new Date(newMessage.date);
          notificationListTmp = [...notificationListTmp, newMessage];
          setNotificationList(notificationListTmp);
        }
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
  

  const isMessageExist = (newMessage, messageList) => {
    let exist = false;
    let retMsg = null;

    for (let index = 0; index < messageList.length; index++) {
      const lupMsg = messageList[index];   
      
      if (lupMsg.slide === newMessage.slide ){
        exist = true;
        retMsg = lupMsg;
        break;
      }
    }

    return {isExit: exist, message: retMsg} ;
  };
  

  const sendQuestionButtonClickHandler = (questionMsg) => {       
    const mqttTopic = getQuestionMqttTopic(broadcastProgrammCode, questionMsg.lang) ;    
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
        {notificationList
          .sort((a, b) => (a.dateUtcJs < b.dateUtcJs ? 1 : -1))
          .map((obj) => ( 
            <div className="QuestionSection" data-key={obj.ID} key={obj.ID}>
              <div className="d-flex h-auto p-2">
                <i className={obj.visible? "bi bi-eye-fill": "bi bi-eye-slash-fill"}  
                  onClick={() => sendQuestionButtonClickHandler(obj)} />
                <span>{getLanguageName(obj.lang)}</span>
              </div>
               <Slide content={obj.slide} isLtr={languageIsLtr(obj.lang)}></Slide>
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
              <Slide content={obj.slide} isLtr={languageIsLtr(obj.lang)}></Slide>
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

export default QuestionMessage;
