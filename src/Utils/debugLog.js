export const isDebugLogEnabled = () =>
  localStorage.getItem("debugLog") === "true";

export const setDebugLogMode = (enabled) => {
  localStorage.setItem("debugLog", enabled);
};

const debugLog = (message, ...optionalParams) => {
  if (isDebugLogEnabled()) {
    console.log(`${message}`, ...optionalParams);
  }
};

export default debugLog;
