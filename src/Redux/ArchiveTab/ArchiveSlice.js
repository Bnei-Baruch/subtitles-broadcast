import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { GetSubtitleData } from "../Subtitle/SubtitleSlice";

// const API = "https://subtitles.bbdev1.kbb1.com/backend/api/v1/";
const API = "http://140.238.249.19:8080/api/v1/";

const initialState = {
  archiveList: [],
  getAuthorList: [],
  getBookList: [],
  getTitleList: [],
  bookmarkList: [],
};
const API_URL = {
  AddData: "selected-content",
  GetALL: "slide",
  GetByID: "",
  Create: "",
  Update: "",
  Delete: "slide",
};

export const GetAllArchiveData = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`, {
      params: data,
    });

    return response.data;
  }
);

export const AddToSubtitleList = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.post(`${API}${API_URL.AddData}`, data);
    thunkAPI.dispatch(GetSubtitleData());
    return response.data;
  }
);
export const DeleteArchive = createAsyncThunk(
  `/${API_URL.Delete}`,
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}${API_URL.Delete}/${data}`);
    {
      response.data.status == true ? toast.success() : toast.error();
    }
    return response.data;
  }
);

export const UserBookmarkList = createAsyncThunk(
  `/UserBookmarkList`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}bookmark`, { params: {} });
    return response.data;
  }
);

export const GetAllAuthor = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}/author`);
    console.log(response, "archive data");
    return response.data;
  }
);
export const GetAllBook = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`);
    console.log(response, "archive data");
    return response.data;
  }
);
export const GetAllTitle = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`);
    console.log(response, "archive data");
    return response.data;
  }
);

export const BookmarkSlide = createAsyncThunk(
  "/BookmarkSlide",
  async (data, thunkAPI) => {
    const response = await axios.post(`${API}bookmark/${data}`);
    console.log(response, "archive data");
    thunkAPI.dispatch(GetAllArchiveData({ language: "en" }));
    return response.data;
  }
);
export const UnBookmarkSlide = createAsyncThunk(
  "/UnBookmarkSlide",
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}bookmark/${data}`);
    console.log(response, "archive data");
    thunkAPI.dispatch(GetAllArchiveData({ language: "en" }));
    thunkAPI.dispatch(UserBookmarkList());
    return response.data;
  }
);
const ArchiveSlice = createSlice({
  name: "Archive",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(GetAllArchiveData.fulfilled, (state, action) => {
      return { ...state, archiveList: action?.payload };
    });
    builder.addCase(GetAllAuthor, (state, { payload }) => {
      return { ...state, authorList: payload };
    });
    builder.addCase(UserBookmarkList.fulfilled, (state, { payload }) => {
      return { ...state, bookmarkList: payload };
    });
  },
});

export const getAllArchiveList = (state) =>
  state?.ArchiveList?.archiveList?.data;

export const getAllBookmarkList = (state) =>
  state?.ArchiveList?.bookmarkList?.data;

export default ArchiveSlice.reducer;
