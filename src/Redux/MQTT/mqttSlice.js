import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
  activeMqttMessage: null,
  otherQuestionMsgCol: {},
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
  },
});

export const {
  messageReceived,
  setActiveMqttMessage,
  setOtherQuestionMsgCol,
  clearMessages,
} = mqttSlice.actions;
export default mqttSlice.reducer;
