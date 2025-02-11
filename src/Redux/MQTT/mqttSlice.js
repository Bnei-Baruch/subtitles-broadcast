import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connected: false,
  messages: [],
};

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    connect(state) {
      state.connected = true;
    },
    disconnect(state) {
      state.connected = false;
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    clearMessages(state) {
      state.messages = [];
    },
  },
});

export const { connect, disconnect, addMessage, clearMessages } =
  mqttSlice.actions;

export default mqttSlice.reducer;
