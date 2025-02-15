import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isConnected: false,
  clientId: null,
  mqttTopics: [],
  mqttMessages: {},
  questionMessagesList: {},
  activeBroadcastMessage: null,
  subtitleRelatedQuestionMessagesList: [],
  selectedSubtitleSlide: null,
  selectedQuestionMessage: null,
  subtitlesDisplayMode: "none",
  rounRobinIndex: 0,
  isUserInitiatedChange: false,
};

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    setConnected(state, action) {
      state.isConnected = action.payload;
    },
    addMqttTopic(state, action) {
      if (!state.mqttTopics.includes(action.payload)) {
        state.mqttTopics.push(action.payload);
      }
    },
    removeMqttTopic(state, action) {
      state.mqttTopics = state.mqttTopics.filter((t) => t !== action.payload);
    },
    setUserSelectedSlide(state, action) {
      state.selectedSubtitleSlide = action.payload; // ✅ UI-Selected Slide (Not Overwritten by MQTT)
    },
    mqttMessageReceived(state, action) {
      const { topic, message } = action.payload;
      const parsedMessage = JSON.parse(message);
      state.mqttMessages[topic] = parsedMessage;

      if (topic.includes("/question")) {
        const lang = parsedMessage.lang;
        state.questionMessagesList[lang] = parsedMessage;
      } else if (topic.includes("/slide")) {
        state.activeBroadcastMessage = parsedMessage; // ✅ MQTT-Received Slide (Separate from UI selection)
      } else if (topic.includes("display_mode")) {
        state.subtitlesDisplayMode = parsedMessage.slide;
      }
    },
    setActiveBroadcastMessage(state, action) {
      state.activeBroadcastMessage = action.payload; // ✅ Store active message
    },
    setSubtitlesDisplayMode: (state, action) => {
      state.subtitlesDisplayMode = action.payload;
      state.isUserInitiatedChange = true; // ✅ Mark as user action
    },
    setSubtitlesDisplayModeFromMQTT: (state, action) => {
      state.subtitlesDisplayMode = action.payload;
      state.isUserInitiatedChange = false; // ✅ Prevent publishing loop
    },
    resetUserInitiatedChange: (state) => {
      state.isUserInitiatedChange = false;
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
  },
});

export const {
  setConnected,
  addMqttTopic,
  removeMqttTopic,
  mqttMessageReceived,
  setActiveBroadcastMessage, // ✅ Added action
  setSubtitlesDisplayMode,
  setSubtitlesDisplayModeFromMQTT,
  resetUserInitiatedChange,
  setClientId,
  setUserSelectedSlide,
  setSelectedQuestionMessage,
  setRounRobinIndex,
} = mqttSlice.actions;

export default mqttSlice.reducer;
