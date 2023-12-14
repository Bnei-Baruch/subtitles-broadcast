import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;
const initialState = {
  userBookmakedList: [],
  liveQusetionList: [],
  contentList: [],
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
    const response = await axios.get(`${API}${API_URL.GetALL}`);
    return response.data;
  }
);

export const GetSlidesDataFromFileId = createAsyncThunk(
  "/GetSlidesDataFromFileId",
  async (data, thunkAPI) => {
    const response = await axios.get(`${process.env.REACT_API_URL}/${data}`);
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
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(GetSubtitleData.fulfilled, (state, action) => {
      return { ...state, contentList: action?.payload };
    });
  },
});

export const getAllArchiveList = (state) =>
  state?.ArchiveList?.archiveList?.data;

export const getAllBookAddedByUser = (state) =>
  state?.SubtitleData?.contentList?.data;

export default SubtitleSlice.reducer;
