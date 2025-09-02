export const DM_SUBTITLES = "subtitles";
export const DM_QUESTIONS = "questions";
export const DM_NONE = "none";

export const ST_SUBTITLE = "subtitle";
export const ST_QUESTION = "question";

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
  { value: "ua", label: "Ukrainian", isLtr: true, order_num: 5 },
  { value: "it", label: "Italian", isLtr: true, order_num: 6 },
  { value: "tr", label: "Turkish", isLtr: true, order_num: 7 },
  { value: "de", label: "German", isLtr: true, order_num: 8 },
];

export const isLtr = (lang) => (broadcastLanguages.find((option) => option.value === lang) || { isLtr: true }).isLtr

export const roundRobinQuestionsLanguages = ["he", "en", "ru", "es"];

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

export let brodcastProgrammMapObj = {};
brodcastProgrammArr.forEach((programmItem, index) => {
  brodcastProgrammMapObj[programmItem.value] = programmItem;
});

export const DEF_BROADCAST_LANG = "he";
export const DEF_BROADCAST_PROG = "morning_lessone";

export default GetLangaugeCode;
