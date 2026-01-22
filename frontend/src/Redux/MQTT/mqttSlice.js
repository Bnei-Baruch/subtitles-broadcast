import { createSlice } from "@reduxjs/toolkit";
import { getSubtitleMqttTopic, getQuestionMqttTopic } from "../../Utils/Common";
import { DM_SUBTITLES, DM_QUESTIONS, broadcastLanguages } from "../../Utils/Const";
import debugLog from "../../Utils/debugLog";

export const lastMessage = (mqttMessages, subtitlesDisplayMode, lang, channel) => {
  if (subtitlesDisplayMode === DM_SUBTITLES) {
    const subtitleTopic = getSubtitleMqttTopic(channel, lang);
    return mqttMessages[subtitleTopic] || null;
  } else if (subtitlesDisplayMode === DM_QUESTIONS) {
    const questionTopic = getQuestionMqttTopic(channel, lang);
    return mqttMessages[questionTopic] || null;
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

const MQTT_LOGS_MAX_LENGTH = 1000;

const initialState = {
  clientId: null,

  isConnected: false,

  mqttTopics: {},    // Keys are topics, value isSubscribed.
  mqttMessages: {},  // Keys are topics, value last message.
  // Last MQTT_LOGS_MAX_LENGTH messages on any topic.
  mqttLogs: [],

  selectedSubtitleSlide: null,
  subtitlesDisplayMode: null,
  isLiveModeEnabled: false,
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
      const { topic, message, broadcastLangCode } = action.payload;
      try {
        const parsedMessage = JSON.parse(message);
        state.mqttMessages[topic] = parsedMessage;
        state.mqttLogs.push({...parsedMessage, topic});
        if (state.mqttLogs.length > MQTT_LOGS_MAX_LENGTH) {
          state.mqttLogs.shift();
        }
        if (broadcastLangCode === parsedMessage.lang) {
          state.subtitlesDisplayMode = parsedMessage?.display_status || "none";
        }
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
      state.subtitlesDisplayMode = action.payload;
    },
    updateSubtitlesDisplayMode: (state, action) => {
      state.subtitlesDisplayMode = action.payload;
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
