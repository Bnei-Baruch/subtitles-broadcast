import { createSlice } from "@reduxjs/toolkit";
import { brodcastProgrammArr, broadcastLanguages } from "../../Utils/Const";

// Initial state for broadcast parameters
const initialState = {
  broadcastLang: broadcastLanguages[0],
  broadcastProgramm: brodcastProgrammArr[0],
};

const BroadcastParamsSlice = createSlice({
  name: "BroadcastParams",
  initialState,
  reducers: {
    setBroadcastLang: (state, action) => {
      state.broadcastLang = action.payload;
    },
    setBroadcastProgramm: (state, action) => {
      state.broadcastProgramm = action.payload;
    },
  },
});

export const { setBroadcastLang, setBroadcastProgramm } =
  BroadcastParamsSlice.actions;

export default BroadcastParamsSlice.reducer;
