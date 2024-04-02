import React, { useState, useEffect, useContext } from "react";
import AppContext from "../AppContext";
import useMqtt, { parseMqttMessage } from "../Utils/UseMqttUtils";
import { Slide } from "../Components/Slide";

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

export function ActiveSlideMessaging({
  userAddedList,
  activatedTab,
  setActivatedTab,
  mqttMessage,
  setMqttMessage,
  jobMqttMessage,
  setJobMqttMessage,
  isLtr,
}) {
  const appContextlData = useContext(AppContext);
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const broadcastLangCode = appContextlData.broadcastLang.value;
  const {
    mqttUnSubscribe,
    mqttSubscribe,
    mqttPublush,
    isConnected,
    payload,
    clientId,
  } = useMqtt();
  const [notificationList, setNotificationList] = useState([]);
  const mqttTopic =
    "subtitles_" + broadcastProgrammCode + "_" + broadcastLangCode;

  function findActiveSlide(userAddedList, activeSlideOrderNum) {
    let retSlide;

    for (let i = 0; i < userAddedList.slides.length; i++) {
      const lupSlide = userAddedList.slides[i];

      if (lupSlide.order_number === activeSlideOrderNum) {
        retSlide = lupSlide;
        break;
      }
    }

    return retSlide;
  }

  const determinePublicJobMsg = (
    userAddedList,
    activatedTab,
    setActivatedTab,
    mqttMessage,
    setMqttMessage,
    jobMqttMessage,
    setJobMqttMessage
  ) => {
    let isPublic = false;

    if (jobMqttMessage) {
      const activeSlideOrderNum = activatedTab - 1;
      const jobMessageJson = parseMqttMessage(jobMqttMessage);
      const mqttMessageJson = parseMqttMessage(mqttMessage);

      if (userAddedList && activatedTab) {
        if (
          !mqttMessageJson ||
          (mqttMessageJson.order_number !== jobMessageJson.order_number &&
            (!jobMqttMessage ||
              jobMqttMessage.order_number !== mqttMessageJson.order_number))
        ) {
          const activeSlide = findActiveSlide(
            userAddedList,
            activeSlideOrderNum
          );

          if (
            activeSlide &&
            activeSlide.source_uid === jobMqttMessage.source_uid
          ) {
            if (activeSlide.order_number !== jobMqttMessage.order_number) {
              setActivatedTab(jobMqttMessage.order_number + 1);
              isPublic = true;
            }
          }
        }
      } else {
        if (
          !mqttMessageJson ||
          mqttMessageJson.order_number !== jobMqttMessage.order_number
        ) {
          isPublic = true;
        }
      }

      if (isPublic) {
        const cloneJobMsgJson = { ...jobMessageJson };
        setMqttMessage(cloneJobMsgJson);
      }
    }

    return isPublic;
  };

  const determinePublishActiveSlide = (
    userAddedList,
    activatedTab,
    mqttMessage,
    setMqttMessage,
    jobMqttMessage,
    setJobMqttMessage,
    mqttClientId
  ) => {
    const mqttMessageJson = parseMqttMessage(mqttMessage);
    const activeSlideOrderNum = activatedTab;
    const jobMessageJson = parseMqttMessage(jobMqttMessage);

    if (userAddedList) {
      if (
        !mqttMessageJson ||
        (mqttMessageJson.order_number !== activeSlideOrderNum &&
          (!jobMessageJson ||
            jobMessageJson.order_number !== activeSlideOrderNum))
      ) {
        const activeSlide = findActiveSlide(userAddedList, activeSlideOrderNum);

        if (
          activeSlide &&
          (!mqttMessageJson ||
            activeSlide.order_number !== mqttMessageJson.order_number)
        ) {
          var jsonMsg = {
            ID: activeSlide.ID,
            bookmark_id: activeSlide.bookmark_id,
            file_uid: activeSlide.file_uid,
            order_number: activeSlide.order_number,
            slide: activeSlide.slide,
            source_uid: activeSlide.source_uid,
            clientId: mqttClientId,
          };
          var jsonMsgStr = JSON.stringify(jsonMsg);

          setJobMqttMessage(null);

          mqttPublush(mqttTopic, jsonMsgStr).then(() => {
            setMqttMessage(jsonMsg);
          });
        }
      }
    }
  };

  const determinePublish = (
    userAddedList,
    activatedTab,
    setActivatedTab,
    mqttMessage,
    setMqttMessage,
    jobMqttMessage,
    setJobMqttMessage,
    mqttClientId
  ) => {
    let isPublished = determinePublicJobMsg(
      userAddedList,
      activatedTab,
      setActivatedTab,
      mqttMessage,
      setMqttMessage,
      jobMqttMessage,
      setJobMqttMessage
    );

    if (!isPublished) {
      determinePublishActiveSlide(
        userAddedList,
        activatedTab,
        mqttMessage,
        setMqttMessage,
        jobMqttMessage,
        setJobMqttMessage,
        mqttClientId
      );
    }
  };

  useEffect(() => {
    Notification.requestPermission();

    return () => {
      mqttUnSubscribe(mqttTopic);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      mqttSubscribe(mqttTopic);

      determinePublish(
        userAddedList,
        activatedTab,
        setActivatedTab,
        mqttMessage,
        setMqttMessage,
        jobMqttMessage,
        setJobMqttMessage,
        clientId
      );
    }
  }, [isConnected]);

  useEffect(() => {
    if (payload.message && [mqttTopic].includes(payload.topic)) {
      const newMessage = JSON.parse(payload.message);
      const notif = [newMessage];
      setNotificationList(notif);
      new Notification(newMessage.slide);

      if (newMessage && newMessage.clientId !== clientId) {
        setJobMqttMessage(newMessage);
      }
    }
  }, [payload]);

  return (
    <>
      <div style={styles.mainContainer}>
        <div className="green-part-cont" style={styles.greenPartContainer}>
          &nbsp;{" "}
        </div>
        <div className="slide-part-cont" style={styles.slidePartContainer}>
          {notificationList.map((obj) => (
            <Slide content={obj.slide} isLtr={isLtr}></Slide>
          ))}
        </div>
      </div>
      {/* <div className="App">
        <div className="card">
          <h3>Last Active Slide </h3>
          <ol>
            {notificationList.map((obj) => (
              // <li>{obj.slide}</li>
              <Slide content={obj.slide} isLtr={isLtr}></Slide>
            ))}
          </ol>
        </div>
      </div> */}
    </>
  );

  // return <div style={{ display: "none" }}></div>;
}

export default ActiveSlideMessaging;
