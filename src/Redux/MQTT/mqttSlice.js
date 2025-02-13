import { createSlice } from "@reduxjs/toolkit";
const initialState = {
  questionMessagesList: [], // ✅ Holds only "type": "question" messages
  activeBroadcastMessage: null, // ✅ Active message for broadcasting
  subtitleRelatedQuestionMessagesList: [], // ✅ Subtitle slides with "slide_type": "question"
  selectedSubtitleSlide: null, // ✅ Currently selected subtitle slide
  selectedQuestionMessage: null, // ✅ Currently selected question message by language
  rounRobinIndex: 0,
};

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    questionMessageReceived: (state, action) => {
      state.questionMessagesList.push(action.payload);
    },
    clearQuestionMessages: (state) => {
      state.questionMessagesList = [];
    },
    setActiveBroadcastMessage: (state, action) => {
      state.activeBroadcastMessage = action.payload;
    },
    setSubtitleRelatedQuestionMessagesList: (state, action) => {
      state.subtitleRelatedQuestionMessagesList = action.payload;
    },
    addUpdateSubtitleRelatedQuestionMessagesList: (state, action) => {
      const existingIndex = state.subtitleRelatedQuestionMessagesList.findIndex(
        (msg) => msg.ID === action.payload.ID
      );

      if (existingIndex !== -1) {
        state.subtitleRelatedQuestionMessagesList[existingIndex] =
          action.payload;
      } else {
        state.subtitleRelatedQuestionMessagesList.push(action.payload);
      }
    },
    setSelectedSubtitleSlide: (state, action) => {
      state.selectedSubtitleSlide = action.payload;
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
  questionMessageReceived,
  setActiveBroadcastMessage,
  setSubtitleRelatedQuestionMessagesList,
  clearQuestionMessages,
  setSelectedSubtitleSlide,
  setSelectedQuestionMessage,
  addUpdateSubtitleRelatedQuestionMessagesList,
  setRounRobinIndex,
} = mqttSlice.actions;
export default mqttSlice.reducer;
