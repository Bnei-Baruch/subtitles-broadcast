import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { GetSubtitleData } from "../Subtitle/SubtitleSlice";

const API = "http://140.238.249.19:8080/api/v1/";

const initialState = {
  archiveList: [],
  getAuthorList: [],
  getBookList: [],
  getTitleList: [],
};
const API_URL = {
  AddData: "selected-content",
  GetALL: "subtitle",
  GetByID: "",
  Create: "",
  Update: "",
  Delete: "",
};

export const GetAllArchiveData = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`, {
      params: data,
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });

    return response.data;
  }
);

export const AddToSubtitleList = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.post(`${API}${API_URL.AddData}`, data, {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    thunkAPI.dispatch(GetSubtitleData());
    return response.data;
  }
);
export const DeleteArchive = createAsyncThunk(
  `/${API_URL.Delete}`,
  async (data, thunkAPI) => {
    const response = await axios.patch(`${API}${API_URL.Delete}`);
    {
      response.data.status == true ? toast.success() : toast.error();
    }
    return response.data;
  }
);

export const UserBookmark = createAsyncThunk(
  `UserBookmark`,
  async (data, thunkAPI) => {
    const response = await axios.post(`${API}`, data, {
      headers: {},
    });
  }
);

export const GetAllAuthor = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`);
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

const ArchiveSlice = createSlice({
  name: "Archive",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(GetAllArchiveData.fulfilled, (state, action) => {
      return { ...state, archiveList: action?.payload };
    });
  },
});

export const getAllArchiveList = (state) =>
  state?.ArchiveList?.archiveList?.data;

export default ArchiveSlice.reducer;
