import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";

const API = "http://localhost:3001/";

const initialState = {
  archiveList: [],
  getAuthorList:[],
  getBookList:[],
  getTitleList:[]
};
const API_URL = {
  GetALL: "archive",
  GetByID: "",
  Create: "",
  Update: "",
  Delete: "",
};

export const GetAllData = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}${API_URL.GetALL}`);
    console.log(response, "archive data");
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
    builder.addCase(GetAllData.fulfilled, (state, action) => {
      return { ...state, archiveList: action?.payload };
    });
  },
});

export const getAllArchiveList = (state) => state?.ArchiveList?.archiveList;

export default ArchiveSlice.reducer;
