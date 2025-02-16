const isLogMode = process.env.NODE_ENV === "development";

const debugLog = (message, ...optionalParams) => {
  if (isLogMode) {
    console.log(`${message}`, ...optionalParams);
  }
};

export default debugLog;
