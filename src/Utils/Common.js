import { broadcastLangMapObj } from "./Const";
import { toast } from "react-toastify";

export const defaultToastOptions = {
  position: "bottom-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

/**
 * Shows a success toast notification with default options.
 * @param {string} message - The message to display.
 * @param {object} options - Additional options to override defaults.
 */
export const showSuccessToast = (message, options = {}) => {
  toast.success(message, { ...defaultToastOptions, ...options });
};

/**
 * Shows an error toast notification with default options.
 * @param {string} message - The message to display.
 * @param {object} options - Additional options to override defaults.
 */
export const showErrorToast = (message, options = {}) => {
  toast.error(message, { ...defaultToastOptions, ...options });
};

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

export function getSubtitlesDisplayModeTopic(
  broadcastProgrammCode,
  broadcastLangCode
) {
  return `subtitles/${broadcastProgrammCode}/${broadcastLangCode}/display_mode`;
}

export const subtitlesDisplayModeTopic = "subtitles/display_mode";

export function languageIsLtr(langCode) {
  let isLeftToRight = true;

  if (langCode) {
    const lnagObj = broadcastLangMapObj[langCode];

    if (lnagObj) {
      isLeftToRight = !(lnagObj.isLtr === false);
    }
  }

  return isLeftToRight;
}
