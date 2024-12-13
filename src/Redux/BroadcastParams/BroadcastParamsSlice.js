import { createSlice } from "@reduxjs/toolkit";

// Initial state for broadcast parameters
const initialState = {
  subtitlesDisplayMode: "none", // Initial mode set to 'none'
};

const BroadcastParamsSlice = createSlice({
  name: "BroadcastParams",
  initialState,
  reducers: {
    setSubtitlesDisplayMode: (state, action) => {
      state.subtitlesDisplayMode = action.payload;
    },
  },
});

// Export the actions
export const { setSubtitlesDisplayMode } = BroadcastParamsSlice.actions;

// Export the reducer
export default BroadcastParamsSlice.reducer;
