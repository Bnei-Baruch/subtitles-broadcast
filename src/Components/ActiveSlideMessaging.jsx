import React, { useContext } from "react";
import AppContext from "../AppContext";
import mqttClientUtils, { parseMqttMessage } from "../Utils/MqttUtils";

let mqttTopic;

const mqttPublish = (msgText, mqttClient, setMqttMessage) => {
  if (mqttClient && mqttTopic) {
    mqttClient.publish(
      mqttTopic,
      msgText,
      { label: "0", value: 0, retain: true },
      (error) => {
        if (error) {
          console.log("Publish error:", error);
        } else {
          if (setMqttMessage) {
            setMqttMessage(msgText);
          }
        }
      }
    );
  } else {
    console.error("Can't publish Active slide, the  mqttClient is not defined");
  }
};

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

function initMqttClient(
  broadcastProgrammCode,
  broadcastLangCode,
  mqttClient,
  setMqttClient,
  jobMqttMessage,
  setJobMqttMessage,
  mqttClientId,
  setMqttClientId
) {
  if (!mqttClient) {
    mqttClientUtils(setMqttClient, setMqttClientId);
  } else {
    subscribeMqttMessage(
      mqttClient,
      setJobMqttMessage,
      mqttClientId,
      jobMqttMessage
    );
    mqttTopic = "subtitles_" + broadcastProgrammCode + "_" + broadcastLangCode;
    mqttClient.subscribe(mqttTopic);
  }
}

function subscribeMqttMessage(
  mqttClient,
  setJobMqttMessage,
  mqttClientId,
  jobMqttMessage
) {
  if (mqttClient && setJobMqttMessage) {
    mqttClient.on("message", function (topic, message) {
      const messageStr = message.toString();
      const jobMessageJson = parseMqttMessage(messageStr);

      if (jobMessageJson && jobMessageJson.clientId !== mqttClientId) {
        var tmp = jobMqttMessage;
        setJobMqttMessage(jobMessageJson);
      }
    });
  }
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
        const activeSlide = findActiveSlide(userAddedList, activeSlideOrderNum);

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
  mqttClient,
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
        var jsonMsgStr = JSON.stringify({
          ID: activeSlide.ID,
          bookmark_id: activeSlide.bookmark_id,
          file_uid: activeSlide.file_uid,
          order_number: activeSlide.order_number,
          slide: activeSlide.slide,
          source_uid: activeSlide.source_uid,
          clientId: mqttClientId,
        });

        setJobMqttMessage(null);
        mqttPublish(jsonMsgStr, mqttClient, setMqttMessage);
      }
    }
  }
};

const determinePublish = (
  userAddedList,
  activatedTab,
  setActivatedTab,
  mqttClient,
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
      mqttClient,
      mqttMessage,
      setMqttMessage,
      jobMqttMessage,
      setJobMqttMessage,
      mqttClientId
    );
  }
};

export function ActiveSlideMessaging({
  userAddedList,
  activatedTab,
  setActivatedTab,
  mqttMessage,
  setMqttMessage,
  jobMqttMessage,
  setJobMqttMessage,
}) {
  const appContextlData = useContext(AppContext);
  const mqttClientId = appContextlData.mqttClientId;
  const setMqttClientId = appContextlData.setMqttClientId;
  const mqttClient = appContextlData.mqttClient;
  const setMqttClient = appContextlData.setMqttClient;
  const broadcastProgrammCode = appContextlData.broadcastProgramm.value;
  const broadcastLangCode = appContextlData.broadcastLang.value;

  initMqttClient(
    broadcastProgrammCode,
    broadcastLangCode,
    mqttClient,
    setMqttClient,
    jobMqttMessage,
    setJobMqttMessage,
    mqttClientId,
    setMqttClientId
  );

  determinePublish(
    userAddedList,
    activatedTab,
    setActivatedTab,
    mqttClient,
    mqttMessage,
    setMqttMessage,
    jobMqttMessage,
    setJobMqttMessage,
    mqttClientId
  );

  return <div style={{ display: "none" }}></div>;
}

export default ActiveSlideMessaging;
