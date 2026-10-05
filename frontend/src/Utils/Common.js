import { broadcastLangMapObj } from "./Const";
import { toast } from "react-toastify";
import { useRef } from 'react';
import isEqual from 'lodash/isEqual'; 

// Per-window toast gate. Only the green window passes ?toasts=0|1 (set by the
// checkbox next to the Green Window button). Any window without the param
// (i.e. the main app) keeps toasts on. When off, toasts are suppressed but the
// console.log in the helpers still fires — so the green-screen video stream
// stays clean while everything is still observable in the console.
const _toastParam = new URLSearchParams(window.location.search).get("toasts");
const toastsEnabled = _toastParam === null || _toastParam === "1";

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
  console.log(`[toast:success] ${message}`);
  if (toastsEnabled) toast.success(message, { ...defaultToastOptions, ...options });
};

/**
 * Shows an error toast notification with default options.
 * @param {string} message - The message to display.
 * @param {object} options - Additional options to override defaults.
 */
export const showErrorToast = (message, options = {}) => {
  console.error(`[toast:error] ${message}`);
  if (toastsEnabled) toast.error(message, { ...defaultToastOptions, ...options });
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

export function getOnOffAirTopic(broadcastProgrammCode) {
  return `subtitles/${broadcastProgrammCode}/on_off_air`;
}

export function getKaraokeMqttTopic(broadcastProgrammCode) {
  return `subtitles/${broadcastProgrammCode}/karaoke`;
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
// Classify a line by its dominant script. Each real script is its own class so
// different-language pairs (e.g. Hebrew+Arabic, Cyrillic+Hebrew) are never
// mistaken for same-language lyrics.
export const scriptOf = (line) =>
  /[֐-׿]/.test(line) ? "he" :
  /[؀-ۿݐ-ݿ]/.test(line) ? "ar" :
  /[Ѐ-ӿ]/.test(line) ? "cyr" : "latin";

// A karaoke slide's two lines are the same language when they share the exact
// same script class; any mismatch (transliteration OR a different language) is
// styled differently.
export const isSameLanguagePair = (line1, line2) =>
  scriptOf(line1) === scriptOf(line2);

export function useDeepMemo(value) {
    const ref = useRef();
    const cache = useRef();

    if (!isEqual(ref.current, value)) {
      ref.current = value;
      cache.current = value;
    }

    return cache.current;
}

