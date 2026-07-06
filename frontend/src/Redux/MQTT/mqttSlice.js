import { createSlice } from "@reduxjs/toolkit";
import { getSubtitleMqttTopic, getQuestionMqttTopic, getOnOffAirTopic, getKaraokeMqttTopic } from "../../Utils/Common";
import { DM_SUBTITLES, DM_QUESTIONS, DM_KARAOKE, broadcastLanguages } from "../../Utils/Const";
import debugLog from "../../Utils/debugLog";

export const lastMessage = (mqttMessages, subtitlesDisplayMode, lang, channel) => {
  if (subtitlesDisplayMode === DM_SUBTITLES) {
    const subtitleTopic = getSubtitleMqttTopic(channel, lang);
    return mqttMessages[subtitleTopic] || null;
  } else if (subtitlesDisplayMode === DM_QUESTIONS) {
    const questionTopic = getQuestionMqttTopic(channel, lang);
    return mqttMessages[questionTopic] || null;
  } else if (subtitlesDisplayMode === DM_KARAOKE) {
    const karaokeTopic = getKaraokeMqttTopic(channel);
    return mqttMessages[karaokeTopic] || null;
  }
  return null;
}

export const getAllQuestions = (mqttMessages, channel) => {
  return broadcastLanguages.reduce((questions, {value: lang}) => {
    const slide = mqttMessages[getQuestionMqttTopic(channel, lang)];
    if (slide) {
      questions[lang] = slide;
    }
    return questions;
  }, {});
}

// Map a selected mode onto the split state: karaoke is the channel-wide
// override; anything else is this client's per-language mode. subtitlesDisplayMode
// is the derived effective value.
function applyDisplayMode(state, mode) {
  if (mode === DM_KARAOKE) {
    state.karaokeActive = true;
  } else {
    state.karaokeActive = false;
    state.langDisplayMode = mode;
  }
  state.subtitlesDisplayMode = state.karaokeActive ? DM_KARAOKE : state.langDisplayMode;
}

const MQTT_LOGS_MAX_LENGTH = 1000;

const initialState = {
  clientId: null,

  isConnected: false,

  mqttTopics: {},    // Keys are topics, value isSubscribed.
  mqttMessages: {},  // Keys are topics, value last message.
  // Last MQTT_LOGS_MAX_LENGTH messages on any topic.
  mqttLogs: [],

  selectedSubtitleSlide: null,
  // Effective display mode = karaokeActive ? "karaoke" : langDisplayMode.
  // Karaoke is channel-wide (overrides everyone); langDisplayMode is this
  // client's own per-language subtitle/question mode.
  subtitlesDisplayMode: null,
  karaokeActive: false,
  langDisplayMode: "none",
  isLiveModeEnabled: false,
  isOnAir: false,
  notificationLogs: [],
};

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    setConnected(state, action) {
      state.isConnected = action.payload;
    },
    updateMqttTopic(state, action) {
      const { topic, isSubscribed } = action.payload;

      if (topic) {
        state.mqttTopics[topic] = isSubscribed;
      }
    },
    removeMqttTopic(state, action) {
      const { topic } = action.payload;

      if (topic && typeof state.mqttTopics[topic] !== "undefined") {
        delete state.mqttTopics[topic];
      }
    },
    setMqttSelectedSlide(state, action) {
      state.selectedSubtitleSlide = action.payload;
    },
    mqttMessageReceived(state, action, dispatch) {
      const { topic, message, broadcastLangCode, broadcastChannel } = action.payload;
      if (topic.endsWith("/on_off_air")) {
        state.isOnAir = message.includes("onair");
        return;
      }
      try {
        const parsedMessage = JSON.parse(message);
        state.mqttMessages[topic] = parsedMessage;
        state.mqttLogs.push({...parsedMessage, topic});
        if (state.mqttLogs.length > MQTT_LOGS_MAX_LENGTH) {
          state.mqttLogs.shift();
        }
        // Karaoke is channel-wide: it only toggles karaokeActive (on/off for
        // everyone). Subtitle/question are per-language: they set this client's
        // langDisplayMode. The effective mode is derived below, so karaoke
        // overrides while it's on and each client falls back to its own mode
        // when it's off — with no cross-language clobbering and no reload race.
        if (topic.endsWith("/karaoke")) {
          if (broadcastChannel && topic === getKaraokeMqttTopic(broadcastChannel)) {
            state.karaokeActive = parsedMessage?.display_status === DM_KARAOKE && parsedMessage?.visible !== false;
          }
        } else if (broadcastLangCode === parsedMessage.lang) {
          state.langDisplayMode = parsedMessage?.display_status || "none";
        }
        state.subtitlesDisplayMode = state.karaokeActive ? DM_KARAOKE : state.langDisplayMode;
      } catch (error) {
        debugLog("MQTT Message Processing Error:", error);
        dispatch(
          addMqttNotification({
            message: "MQTT Message Processing Error",
            type: "error",
          })
        );
      }
    },
    setSubtitlesDisplayMode: (state, action) => {
      applyDisplayMode(state, action.payload);
    },
    updateSubtitlesDisplayMode: (state, action) => {
      applyDisplayMode(state, action.payload);
    },
    setClientId: (state, action) => {
      state.clientId = action.payload;
    },
    addMqttNotification: (state, action) => {
      const generateNotificationId = () => Math.random().toString(36).substr(2, 9);

      const notificationData =
        typeof action.payload === "string"
          ? {
              id: generateNotificationId(),
              message: action.payload,
              timestamp: new Date().toISOString(),
              type: "error",
              uiPresented: false,
            }
          : {
              id: generateNotificationId(),
              message: action.payload.message || "Unknown MQTT Notification",
              timestamp: action.payload.timestamp || new Date().toISOString(),
              type: action.payload.type || "error",
              uiPresented: false,
            };

      state.notificationLogs.push(notificationData);
    },
    clearMqttNotifications: (state) => {
      state.notificationLogs = [];
    },
    markNotificationAsUiPresented: (state, action) => {
      const index = state.notificationLogs.findIndex(
        (notification) => notification.id === action.payload
      );
      if (index !== -1) {
        state.notificationLogs[index].uiPresented = true;
      }
    },
    setLiveModeEnabled(state, action) {
      state.isLiveModeEnabled = action.payload;
    },
  },
});

export const {
  setConnected,
  updateMqttTopic,
  removeMqttTopic,
  mqttMessageReceived,
  setActiveBroadcastMessage,
  setSubtitlesDisplayMode,
  setClientId,
  setMqttSelectedSlide,
  setRounRobinIndex,
  addMqttNotification,
  clearMqttNotifications,
  markNotificationAsUiPresented,
  updateSubtitlesDisplayMode,
  setLiveModeEnabled,
} = mqttSlice.actions;

export default mqttSlice.reducer;
