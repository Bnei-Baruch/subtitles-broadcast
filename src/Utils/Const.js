function GetLangaugeCode() {
  return {
    English: "en",
    Spanish: "es",
    Hebrew: "he",
    Russian: "ru",
    Bulgarian: "bg",
    Czech: "cs",
    German: "de",
    Norwegian: "no",
    Polish: "pl",
    Portuguese: "pt",
    Turkish: "tr",
    French: "fr",
    Italian: "it",
    Romanian: "ro",
    Ukrainian: "ua",
    Georgian: "ka",
    Indonesian: "id",
    Latvian: "lv",
  };
}

export const broadcastLanguages = [
  { value: "he", label: "Hebrew", isLtr: false },
  { value: "ru", label: "Russian", isLtr: true },
  { value: "en", label: "English", isLtr: true },
  { value: "es", label: "Spanish", isLtr: true },
];

export let broadcastLangMapObj = {};
broadcastLanguages.forEach((langObj, index) => {
  broadcastLangMapObj[langObj.value] = langObj;
});

export const brodcastProgrammArr = [
  { value: "morning_lesson", label: "Morning lesson" },
  { value: "brodcast_1", label: "Brodcast 1" },
  { value: "brodcast_2", label: "Brodcast 2" },
  { value: "brodcast_3", label: "Brodcast 3" },
];

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
    "broadcastProgrammObj"
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

export default GetLangaugeCode;
