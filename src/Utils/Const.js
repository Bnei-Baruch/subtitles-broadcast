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
  { value: "he", label: "Hebrew" },
  { value: "ru", label: "Russian" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
];

export const broadcastLangMapObj = broadcastLanguages.map(
  function (broadcastLangObj) {
    var obj = {};
    obj[broadcastLangObj.value] = obj;
    return obj;
  }
);

export default GetLangaugeCode;
