import { broadcastLangMapObj, broadcastLanguages } from "./Const";

export function getCurrentBroadcastLanguage() {
  let bcLangObj;
  const broadcastLangObjStr = sessionStorage.getItem("broadcastLangObj");

  if (broadcastLangObjStr) {
    bcLangObj = JSON.parse(broadcastLangObjStr);
  } else {
    const bcLanglocalStorageVal = localStorage.getItem("broadcastLanguage");

    bcLangObj = broadcastLangMapObj[bcLanglocalStorageVal]
      ? broadcastLangMapObj[bcLanglocalStorageVal]
      : broadcastLanguages[0];

    console.log("init broadcastLangObj");
  }

  return bcLangObj;
}

export function getCurrentBroadcastProgramm() {
  let bcProgrammObj;
  const broadcastProgrammObjStr = sessionStorage.getItem(
    "broadcastProgrammObj",
  );
  if (broadcastProgrammObjStr) {
    bcProgrammObj = JSON.parse(broadcastProgrammObjStr);
  } else {
    console.log("init broadcastProgrammObj");
    bcProgrammObj = { value: "morning_lesson", label: "Morning lesson" };
  }

  return bcProgrammObj;
}

export function parseMqttMessage(mqttMessage) {
  if (mqttMessage) {
    try {
      if (typeof mqttMessage === "string") {
        let msgJson = JSON.parse(mqttMessage);

        return msgJson;
      }
    } catch (err) {
      console.log(err);
    }

    return mqttMessage;
  }
}

export function getSubtitleMqttTopic(broadcastProgrammCode, broadcastLangCode) {
  return `subtitles/${broadcastProgrammCode}/${broadcastLangCode}/slide`;
}

export function getQuestionMqttTopic(broadcastProgrammCode, broadcastLangCode) {
  return `subtitles/${broadcastProgrammCode}/${broadcastLangCode}/question`;
}

export const subtitlesDisplayModeTopic = "subtitles/display_mode";

export const getMqttClientId = () => {
  let clientId;
  const ssMqttClientId = sessionStorage.getItem("mqttClientId");

  if (ssMqttClientId) {
    clientId = ssMqttClientId;
  } else {
    clientId = `kab_subtitles_${Math.random().toString(16).substr(2, 8)}`;
    sessionStorage.setItem("mqttClientId", clientId);
  }

  return clientId;
};
