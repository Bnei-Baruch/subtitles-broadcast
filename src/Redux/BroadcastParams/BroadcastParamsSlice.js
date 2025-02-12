import { createSlice } from "@reduxjs/toolkit";
import { brodcastProgrammArr, broadcastLanguages } from "../../Utils/Const";

// Initial state for broadcast parameters
const initialState = {
  subtitlesDisplayMode: "none",
  broadcastLang: broadcastLanguages[0],
  broadcastProgramm: brodcastProgrammArr[0],
  isUserInitiatedChange: false, // ✅ Track if user changed display mode
};

const BroadcastParamsSlice = createSlice({
  name: "BroadcastParams",
  initialState,
  reducers: {
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
    initializeSubtitlesDisplayMode: (state, action) => {
      if (state.subtitlesDisplayMode === "none") {
        state.subtitlesDisplayMode = action.payload;
      }
    },
    setBroadcastLang: (state, action) => {
      state.broadcastLang = action.payload;
    },
    setBroadcastProgramm: (state, action) => {
      state.broadcastProgramm = action.payload;
    },
  },
});

export const {
  setSubtitlesDisplayMode,
  setSubtitlesDisplayModeFromMQTT, // ✅ New action
  initializeSubtitlesDisplayMode,
  setBroadcastLang,
  setBroadcastProgramm,
  resetUserInitiatedChange,
} = BroadcastParamsSlice.actions;

export default BroadcastParamsSlice.reducer;
