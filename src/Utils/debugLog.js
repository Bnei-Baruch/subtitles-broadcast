const debugLog = (message, ...optionalParams) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEBUG]: ${message}`, ...optionalParams);
  }
};

export default debugLog;
