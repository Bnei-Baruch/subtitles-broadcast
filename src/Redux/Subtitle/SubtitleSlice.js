import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;
const initialState = {
  userBookmakedList: [],
  liveQusetionList: [],
  contentList: [],
  focusSlideId: {},
};

const API_URL = {
  GetALL: "book-list",
  GetByID: "",
  Create: "",
  Update: "",
  Delete: "",
};

export const GetSubtitleData = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}file_slide/${data}`);
    return response.data;
  }
);

export const GetSlidesDataFromFileId = createAsyncThunk(
  "/GetSlidesDataFromFileId",
  async (data, thunkAPI) => {
    const response = await axios.get(`${process.env.REACT_API_URL}/${data}`);
    return response.data;
  }
);

export const RemoveSubtitleData = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}${API_URL.GetALL}`);
    return response.data;
  }
);
const SubtitleSlice = createSlice({
  name: "Subtitle",
  initialState,
  reducers: {
    StoreFocusSlideId: (state, { payload }) => {
      return { ...state, focusSlideId: payload };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(GetSubtitleData.fulfilled, (state, action) => {
      return { ...state, contentList: action?.payload };
    });
  },
});
export const { StoreFocusSlideId } = SubtitleSlice.actions;

export const getAllArchiveList = (state) =>
  state?.ArchiveList?.archiveList?.data;

export const getAllBookAddedByUser = (state) =>
  state?.SubtitleData?.contentList?.data;

export default SubtitleSlice.reducer;
