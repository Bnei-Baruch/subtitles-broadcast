export const isDebugLogEnabled = () =>
  localStorage.getItem("debugLog") === "true";

export const setDebugLogMode = (enabled) => {
  localStorage.setItem("debugLog", enabled);
};

export const isUseTraceEnabled = () =>
  localStorage.getItem("useTrace") === "true";

export const setUseTraceMode = (enabled) => {
  localStorage.setItem("useTrace", enabled);
};

const debugLog = (message, ...optionalParams) => {
  if (isDebugLogEnabled()) {
    if (isUseTraceEnabled()) {
      console.trace(`${message}`, ...optionalParams);
    } else {
      console.log(`${message}`, ...optionalParams);
    }
  }
};

export default debugLog;
