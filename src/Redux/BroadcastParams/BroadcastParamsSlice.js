import { createSlice } from "@reduxjs/toolkit";
import { brodcastProgrammArr, broadcastLanguages } from "../../Utils/Const";

// Initial state for broadcast parameters
const initialState = {
  subtitlesDisplayMode: "none",
  broadcastLang: broadcastLanguages[0],
  broadcastProgramm: brodcastProgrammArr[0],
};

const BroadcastParamsSlice = createSlice({
  name: "BroadcastParams",
  initialState,
  reducers: {
    setSubtitlesDisplayMode: (state, action) => {
      state.subtitlesDisplayMode = action.payload;
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

// Export the actions
export const {
  setSubtitlesDisplayMode,
  initializeSubtitlesDisplayMode,
  setBroadcastLang,
  setBroadcastProgramm,
} = BroadcastParamsSlice.actions;

// Export the reducer
export default BroadcastParamsSlice.reducer;
