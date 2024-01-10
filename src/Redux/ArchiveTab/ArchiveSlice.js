import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { GetSubtitleData } from "../Subtitle/SubtitleSlice";

const API = process.env.REACT_APP_API_BASE_URL;

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
export const GetAllAuthorList = createAsyncThunk(
  `/GetAllAuthorList`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}author`, {
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
  `DeleteArchive`,
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}${API_URL.Delete}/${data}`);

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
    return response.data;
  }
);
export const GetAllBook = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`);
    return response.data;
  }
);
export const GetAllTitle = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`);
    return response.data;
  }
);

export const BookmarkSlide = createAsyncThunk(
  "/BookmarkSlide",
  async (data, thunkAPI) => {
    const response = await axios.post(`${API}bookmark`, data);
    thunkAPI.dispatch(GetAllArchiveData({ language: "en" }));
    return response.data;
  }
);
export const UnBookmarkSlide = createAsyncThunk(
  "/UnBookmarkSlide",
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}bookmark/${data}`);
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
    builder.addCase(DeleteArchive.rejected, (state, action) => {
      toast.error("Something went wrong");
      return state;
    });
    builder.addCase(DeleteArchive.fulfilled, (state, action) => {
      toast.success("Successfully deleted");
      return state;
    });
    builder.addCase(GetAllAuthor, (state, { payload }) => {
      return { ...state, authorList: payload };
    });
    builder.addCase(UserBookmarkList.fulfilled, (state, { payload }) => {
      return { ...state, bookmarkList: payload };
    });
    builder.addCase(GetAllAuthorList.fulfilled, (state, { payload }) => {
      return { ...state, getAuthorList: payload };
    });
  },
});

export const getAllArchiveList = (state) =>
  state?.ArchiveList?.archiveList?.data;

export const getAllBookmarkList = (state) =>
  state?.ArchiveList?.bookmarkList?.data;

export const getAllAuthorList = (state) =>
  state?.ArchiveList?.getAuthorList?.data;

export default ArchiveSlice.reducer;
