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
  { value: "he", label: "Hebrew", isLtr: false, order_num: 1 },
  { value: "en", label: "English", isLtr: true, order_num: 2 },
  { value: "ru", label: "Russian", isLtr: true, order_num: 3 },
  { value: "es", label: "Spanish", isLtr: true, order_num: 4 },
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

export const MAX_SLIDE_LIMIT = 2000;

export default GetLangaugeCode;
