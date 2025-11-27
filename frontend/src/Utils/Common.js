import { broadcastLangMapObj } from "./Const";
import { toast } from "react-toastify";
import { useRef } from 'react';
import isEqual from 'lodash/isEqual'; 

export const defaultToastOptions = {
  position: "bottom-right",
  autoClose: 3000,
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

export const visibleSlideOrNull = (s) => (s && s.visible !== false && s.slide && s.slide.trim() && s) || null;

export function useDeepMemo(value) {
    const ref = useRef();
    const cache = useRef();

    if (!isEqual(ref.current, value)) {
      ref.current = value;
      cache.current = value;
    }

    return cache.current;
}

