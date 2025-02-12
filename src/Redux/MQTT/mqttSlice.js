import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
  activeMqttMessage: null,
  otherQuestionMsgCol: [],
  subtitleMqttMessage: null,
  questionMqttMessage: null,
  rounRobinIndex: 0,
};

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    messageReceived: (state, action) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setActiveMqttMessage: (state, action) => {
      state.activeMqttMessage = action.payload;
    },
    setOtherQuestionMsgCol: (state, action) => {
      state.otherQuestionMsgCol = action.payload;
    },
    addUpdateOtherQuestionMsgCol: (state, action) => {
      const existingIndex = state.otherQuestionMsgCol.findIndex(
        (slide) => slide.ID === action.payload.ID
      );

      if (existingIndex !== -1) {
        state.otherQuestionMsgCol[existingIndex] = action.payload;
      } else {
        state.otherQuestionMsgCol.push(action.payload);
      }
    },
    setSubtitleMqttMessage: (state, action) => {
      state.subtitleMqttMessage = action.payload;
    },
    setQuestionMqttMessage: (state, action) => {
      state.questionMqttMessage = action.payload;
    },
    setRounRobinIndex: (state, action) => {
      state.rounRobinIndex = action.payload; // ✅ Store rounRobinIndex in Redux
    },
  },
});

export const {
  messageReceived,
  setActiveMqttMessage,
  setOtherQuestionMsgCol,
  clearMessages,
  setSubtitleMqttMessage,
  setQuestionMqttMessage,
  addUpdateOtherQuestionMsgCol,
  setRounRobinIndex,
} = mqttSlice.actions;
export default mqttSlice.reducer;
