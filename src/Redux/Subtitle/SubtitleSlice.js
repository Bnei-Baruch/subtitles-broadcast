import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

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
    const response = await axios.get(
      `${"http://140.238.249.19:8080/api/v1/"}${API_URL.GetALL}`,
      {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      }
    );
    return response.data;
  }
);

export const RemoveSubtitleData = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.delete(
      `${"http://140.238.249.19:8080/api/v1/"}${API_URL.GetALL}`,
      {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      }
    );
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
