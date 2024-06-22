import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import GetLangaugeCode from "../../Utils/Const";

const API = process.env.REACT_APP_API_BASE_URL;
const languages = GetLangaugeCode()

const initialState = {
  sourcePathList: [],
  getBookList: [],
  getTitleList: [],
  bookmarkList: [],
  bookmarkListLoading: false,
};
const API_URL = {
  GetALL: "source_path",
  Delete: "source-slide",
};

export const GetAllSourcePathData = createAsyncThunk(
  `/${API_URL.GetALL}`,
  async (data, thunkAPI) => {
    if (data.language) {
      data.language = languages[data.language];
    }
    const response = await axios.get(`${API}${API_URL.GetALL}`, {
      params: data,
    });

    return response.data;
  }
);

export const DeleteSource = createAsyncThunk(
  `DeleteSource`,
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}${API_URL.Delete+"/"+data.source_uid+"?force_delete_bookmarks=true"}`, {
    });

    thunkAPI.dispatch(GetAllSourcePathData({ language: data.language, keyword: data.search_keyword }));

    return response.data;
  }
);

export const UserBookmarkList = createAsyncThunk(
  `/UserBookmarkList`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}bookmark`, { params: { language: languages[data.language] } });
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
    try {
      const response = await axios.post(`${API}bookmark`, data.data);
      thunkAPI.dispatch(UserBookmarkList({ language: data.language }));
      return response.data;
    } catch (error) {
      return error.response.data.description; // This will be available as action.error.message
    }
  }
);
export const BookmarkSlideFromArchivePage = createAsyncThunk(
  "/BookmarkSlideFromArchivePage",
  async (data, thunkAPI) => {
    try {
      const response = await axios.post(`${API}bookmark`, data.data);
      thunkAPI.dispatch(GetAllSourcePathData({ language: data.language, ...data.params, keyword:data.search_keyword }));
      thunkAPI.dispatch(UserBookmarkList({ language: data.language }));
      return response.data;
    } catch (error) {
      return error.response.data.description; // This will be available as action.error.message
    }
  }
);
export const BookmarksSlide = createAsyncThunk(
  "/BookmarksSlide",
  async (data, thunkAPI) => {
    try {
      data?.forEach((key, index) => {
        axios.post(`${API}bookmark`, {
          file_uid: key?.file_uid,
          slide_id: key?.slide_id,
          update: true,
          order: index,
          params: { page: 1, limit: 10 },
        });
      });
    } catch (error) {
      return error.response.data.description; // This will be available as action.error.message
    }
  }
);
export const UnBookmarkSlide = createAsyncThunk(
  "/UnBookmarkSlide",
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}bookmark/${data.bookmark_id}`);
    thunkAPI.dispatch(GetAllSourcePathData({ language: data.language, keyword: data.search_keyword }));
    thunkAPI.dispatch(UserBookmarkList({ language: data.language }));
    return response.data;
  }
);

export const SlideListWithFildeUid = createAsyncThunk(
  "/SlideListWithFildeUid",
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}slide`, { params: data });

    return response.data;
  }
);

const SourceSlice = createSlice({
  name: "Source",
  initialState,
  reducers: {
    emptyAutoComplete: (state, { payload }) => {
      return { ...state, autocomplete: [] };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(GetAllSourcePathData.fulfilled, (state, action) => {
      return { ...state, sourcePathList: action?.payload };
    });
    builder.addCase(DeleteSource.rejected, (state, action) => {
      toast.error("Something went wrong");
      return state;
    });
    builder.addCase(DeleteSource.fulfilled, (state, action) => {
      toast.success("Successfully deleted");
      return state;
    });
    builder.addCase(UserBookmarkList.pending, (state) => {
      return { ...state, bookmarkListLoading: true };
    });
    builder.addCase(UserBookmarkList.fulfilled, (state, { payload }) => {
      return { ...state, bookmarkList: payload, bookmarkListLoading: false};
    });
    builder.addCase(BookmarkSlide.fulfilled, (state, { payload }) => {
      return { ...state, bookmarkList: payload };
    });

    builder.addCase(SlideListWithFildeUid.fulfilled, (state, { payload }) => {
      return { ...state, editSlideList: payload };
    });
  },
});
export const { emptyAutoComplete } = SourceSlice.actions;

export const getAllSourcePathList = (state) =>
  state?.SourceList?.sourcePathList?.data;

export const getAllBookmarkList = (state) =>
  state?.SourceList?.bookmarkList?.data;

export const getAllBookmarkListLoading = (state) =>
  state?.SourceList?.bookmarkListLoading;

export default SourceSlice.reducer;
