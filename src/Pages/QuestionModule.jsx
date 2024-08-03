import React, { useState, useEffect } from "react";
import "./PagesCSS/Questions.css";
import QuestionMessage from "../Components/QuestionMessage";
import {
  broadcastLanguages,
} from "../Utils/Const";
import {
  getCurrentBroadcastLanguage,
  getCurrentBroadcastProgramm,
  getQuestionMqttTopic,
  languageIsLtr,
} from "../Utils/Common";
import { publishEvent, subscribeEvent, unSubscribeEvent } from "../Utils/Events";

const QuestionModule = () => {
  const curBroadcastLanguage = getCurrentBroadcastLanguage();
  const mqttClientId = localStorage.getItem("mqttClientId");

  const newQuestionTxtRef = React.createRef();
  const [handleSuccess, sethandleSuccess] = useState(false);

  const [broadcastProgrammObj, setBroadcastProgrammObj] = useState(() => {
    return getCurrentBroadcastProgramm();
  });
  const [broadcastLangObj, setBroadcastLangObj] = useState(() => {
    return curBroadcastLanguage;
  });
  const broadcastProgrammCode = broadcastProgrammObj.value;
  const broadcastLangCode = broadcastLangObj.value;
  const [isLtr, setIsLtr] = useState(()=>{
    return languageIsLtr(broadcastLangCode)
  });

  const clearButtonClickHandler = () => {
    sethandleSuccess(false);

    if (newQuestionTxtRef.current) {
      newQuestionTxtRef.current.value = "";
      newQuestionTxtRef.current.focus();
    }
  };

  const sendQuestionButtonClickHandler = () => {
    if (newQuestionTxtRef.current) {
      const qustionTxt = newQuestionTxtRef.current.value;

      if (qustionTxt) {
        const jsonMsg = {
          type: "question",
          ID: Math.random().toString(16).substring(2, 8),
          clientId: mqttClientId,
          lang:
            broadcastLangCode && broadcastLangCode.value
              ? broadcastLangCode.value
              : broadcastLangCode,
          slide: qustionTxt,
          date: new Date().toUTCString(),
          visible: true,
          isLtr: isLtr,
        };

        const jsonMsgStr = JSON.stringify(jsonMsg);
        const mqttTopic = getQuestionMqttTopic(broadcastProgrammCode, broadcastLangCode);

        publishEvent("mqttPublush", {
          mqttTopic: mqttTopic,
          message: jsonMsgStr,
        });
      }
    }
    
    newQuestionTxtRef.current.focus();
  };

  
  let subscribed = false;
  const compSubscribeEvents = () => {
    if (!subscribed) {
      subscribeEvent("mqttMessagePublished", messagePublishedHandling);
    }
    subscribed = true;
  };

  const compUnSubscribeAppEvents = () => {
    unSubscribeEvent("mqttMessagePublished", messagePublishedHandling);
  };

  const messagePublishedHandling = ()=>{
    sethandleSuccess(true);
  };

  
  useEffect(() => {  
    if (newQuestionTxtRef.current) {
      newQuestionTxtRef.current.focus();
    }
    
    const timeoutId = setTimeout(() => {
      compSubscribeEvents();
    
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      compUnSubscribeAppEvents();
    };
  }, []);
  
  useEffect(() => {     
    const timeoutId = setTimeout(() => {
      if (newQuestionTxtRef.current) {
        newQuestionTxtRef.current.focus();
      }    
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [curBroadcastLanguage]);

  const setLtrClickHandler = ()=>{
    setIsLtr(!isLtr);
    
    if (newQuestionTxtRef.current) {
      newQuestionTxtRef.current.focus();
    }
  };

  if (curBroadcastLanguage.value !== broadcastLangObj.value){
    setBroadcastLangObj(curBroadcastLanguage) ;   
    setIsLtr(languageIsLtr(curBroadcastLanguage.value));    
  }

  return (
    <div className="form-Question">
      <p className="QutionTitle">Workshop question</p>
      <div className="d-flex flex-column  h-auto">
        <div className=" d-flex justify-content-end  p-0 mb-2">
          <button
            type="button"
            onClick={() => setLtrClickHandler(!isLtr)}
            className="btn btn-info mx-1"
          >
            {isLtr ? "LTR" : "RTL"}
          </button>
          <button
            className="btn btn-secondary mx-1"
            onClick={clearButtonClickHandler}
          >
            Clear
          </button>
          <button
            className="btn btn-success mx-1"
            onClick={() => sendQuestionButtonClickHandler()}
          >
            Send question
          </button>
        </div>
        <div className=" SendQutionTextBox">
          {handleSuccess && (
            <span className="SentToast d-flex justify-content-center align-items-center">
              <i className="bi bi-check-circle text-success p-1" />
              <span className="p-1">Successfully sent</span>
              <i
                onClick={() => clearButtonClickHandler()}
                className="bi bi-x p-1 cursor-pointer"
              />
            </span>
          )}
          <textarea
            ref={newQuestionTxtRef}
            className={"new-question-txt form-control"}
            id="new_question_txt"
            rows="8"
            placeholder="New Question typing"
            dir={isLtr ? "ltr" : "rtl"}
          ></textarea>
        </div>
      </div>
      <div className="my-5">
        <p>History</p>
        <div className="SendQutionHistory">
          <ul>
            <QuestionMessage
              languagesList={broadcastLanguages}
            ></QuestionMessage>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionModule;
