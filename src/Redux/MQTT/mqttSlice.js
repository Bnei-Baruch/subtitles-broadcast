import { createSlice } from "@reduxjs/toolkit";
import {
  getSubtitleMqttTopic,
  getSubtitlesDisplayModeTopic,
} from "../../Utils/Common";
import debugLog from "../../Utils/debugLog";

const initialState = {
  isConnected: false,
  clientId: null,
  mqttTopics: {},
  mqttMessages: {},
  questionMessagesList: {},
  activeBroadcastMessage: null,
  subtitleRelatedQuestionMessagesList: [],
  selectedSubtitleSlide: null,
  selectedQuestionMessage: null,
  subtitlesDisplayMode: "none",
  rounRobinIndex: 0,
  isUserInitiatedChange: false,
  errorLogs: [],
  isSubtitlesModeLoading: false,
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
    setUserSelectedSlide(state, action) {
      state.selectedSubtitleSlide = action.payload;
    },
    mqttMessageReceived(state, action, dispatch) {
      const { topic, message, broadcastLangCode, broadcastProgrammCode } =
        action.payload;
      try {
        const parsedMessage = JSON.parse(message);
        state.mqttMessages[topic] = parsedMessage;

        if (topic.includes("/question")) {
          const lang = parsedMessage.lang;
          state.questionMessagesList[lang] = parsedMessage;
        } else {
          if (broadcastProgrammCode && broadcastLangCode) {
        const subtitleMqttTopic = getSubtitleMqttTopic(
          broadcastProgrammCode,
          broadcastLangCode
        );
        const displayModeTopic = getSubtitlesDisplayModeTopic(
          broadcastProgrammCode,
          broadcastLangCode
        );

        if (topic === subtitleMqttTopic) {
          state.activeBroadcastMessage = parsedMessage;
        } else if (topic === displayModeTopic) {
          state.subtitlesDisplayMode = parsedMessage.slide;
          state.isSubtitlesModeLoading = false;
        }
          }
        }
      } catch (error) {
        debugLog("❌ MQTT Message Processing Error:", error);
        state.isSubtitlesModeLoading = false; 
        dispatch(addMqttError({ message: "MQTT Message Processing Error", type: "Processing" }));
      }
    },
    setActiveBroadcastMessage(state, action) {
      state.activeBroadcastMessage = action.payload;
    },
    setSubtitlesDisplayMode: (state, action) => {
      state.subtitlesDisplayMode = action.payload;
      state.isUserInitiatedChange = true;
      state.isSubtitlesModeLoading = true;
    },
    setSubtitlesDisplayModeFromMQTT: (state, action) => {
      state.subtitlesDisplayMode = action.payload;
      state.isUserInitiatedChange = false;
      state.isSubtitlesModeLoading = false;
    },
    resetUserInitiatedChange: (state) => {
      state.isUserInitiatedChange = false;
    },
    setUserInitiatedChange: (state, action) => {
      state.isUserInitiatedChange = action.payload;
    },
    setClientId: (state, action) => {
      state.clientId = action.payload;
    },
    setSelectedQuestionMessage: (state, action) => {
      state.selectedQuestionMessage = action.payload;
    },
    setRounRobinIndex: (state, action) => {
      state.rounRobinIndex = action.payload;
    },
    addMqttError: (state, action) => {
      const generateErrorId = () => Math.random().toString(36).substr(2, 9);

      const errorData =
        typeof action.payload === "string"
          ? {
              id: generateErrorId(),
              message: action.payload,
              timestamp: new Date().toISOString(),
              type: "General",
              uiPresented: false,
            }
          : {
              id: generateErrorId(),
              message: action.payload.message || "Unknown MQTT Error",
              timestamp: action.payload.timestamp || new Date().toISOString(),
              type: action.payload.type || "General",
              uiPresented: false,
            };

      state.errorLogs.push(errorData);
    },
    clearMqttErrors: (state) => {
      state.errorLogs = [];
    },
    markErrorAsUiPresented: (state, action) => {
      const index = state.errorLogs.findIndex(
        (error) => error.id === action.payload
      );
      if (index !== -1) {
        state.errorLogs[index].uiPresented = true;
      }
    },
    setSubtitlesModeLoading: (state, action) => {
      state.isSubtitlesModeLoading = action.payload;
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
  setSubtitlesDisplayModeFromMQTT,
  resetUserInitiatedChange,
  setClientId,
  setUserSelectedSlide,
  setSelectedQuestionMessage,
  setRounRobinIndex,
  addMqttError,
  clearMqttErrors,
  markErrorAsUiPresented,
  setUserInitiatedChange,
  setSubtitlesModeLoading,
} = mqttSlice.actions;

export default mqttSlice.reducer;
