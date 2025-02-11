import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [], // Stores received MQTT messages
};

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    messageReceived: (state, action) => {
      state.messages.push(action.payload); // Store new message
    },
    clearMessages: (state) => {
      state.messages = []; // Clear stored messages
    },
  },
});

export const { messageReceived, clearMessages } = mqttSlice.actions;
export default mqttSlice.reducer;
