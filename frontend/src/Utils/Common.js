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

/**
 * Compares two PostgreSQL LSN tokens (e.g., "0/1A5C").
 * Returns: -1 (A < B), 0 (A = B), or 1 (A > B).
 */
export function compareLsns(lsnA, lsnB) {
    if (lsnA === lsnB) return 0;

    // Helper to zero-pad a hexadecimal LSN part to its full 8-character width.
    const padHex = (hex) => hex.toUpperCase().padStart(8, '0');

    /**
     * Converts a "Page/Offset" LSN string into a single, fixed-length 
     * chronologically comparable string (e.g., "0/123" -> "0000000000000123").
     */
    const canonicalizeLsn = (lsn) => {
        const parts = lsn.split('/');
        if (parts.length !== 2) {
            throw new Error(`Invalid LSN format: ${lsn}`);
        }
        // Concatenate the padded Page (parts[0]) and padded Offset (parts[1])
        return padHex(parts[0]) + padHex(parts[1]);
    };

    try {
        // Create the single, fixed-length string representations
        const canonicalA = canonicalizeLsn(lsnA);
        const canonicalB = canonicalizeLsn(lsnB);

        // Perform simple lexicographical (string) comparison, which is now safe
        if (canonicalA < canonicalB) return -1;
        if (canonicalA > canonicalB) return 1;
        
        return 0;

    } catch (error) {
        console.error("LSN comparison error:", error.message);
        throw error;
    }
}


/**
 * Returns the chronologically latest LSN token, or an empty string.
 */
export function getLatestLsn(lsnA, lsnB) {
    const a = lsnA || undefined;
    const b = lsnB || undefined;

    if (a === undefined) return b;
    if (b === undefined) return a;

    try {
        // Use comparison function to determine the latest
        return compareLsns(a, b) >= 0 ? a : b;
        
    } catch (error) {
        console.warn(`LSN comparison failed: ${error.message}. Returning empty string.`);
        return undefined;
    }
}
