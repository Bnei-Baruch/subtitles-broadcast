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
  { value: "en", label: "English", isLtr: true },
  { value: "ru", label: "Russian", isLtr: true },
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

export default GetLangaugeCode;
