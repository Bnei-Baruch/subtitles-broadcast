import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
  activeMqttMessage: null,
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
      state.activeMqttMessage = action.payload; // ✅ Store the latest selected message
    },
  },
});

export const { messageReceived, setActiveMqttMessage } = mqttSlice.actions;
export default mqttSlice.reducer;
