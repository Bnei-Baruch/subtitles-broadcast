import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { GetSubtitleData } from "../Subtitle/SubtitleSlice";
import { MAX_SLIDE_LIMIT } from "../../Utils/Const";
import debugLog from "../../Utils/debugLog";
import { showSuccessToast, showErrorToast } from "../../Utils/Common";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  archiveList: [],
  getAuthorList: [],
  getBookList: [],
  getTitleList: [],
  bookmarkList: [],
  bookmarkListLoading: false,
  autocomplete: [],
  editSlideList: [],
};
const API_URL = {
  AddData: "selected-content",
  GetALL: "slide",
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
    thunkAPI.dispatch(GetSubtitleData({ limit: MAX_SLIDE_LIMIT }));
    return response.data;
  }
);

export const ArchiveAutoComplete = createAsyncThunk(
  `ArchiveAutoComplete`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}auto_complete`, { params: data });

    return response.data;
  }
);

export const UserBookmarkList = createAsyncThunk(
  `/UserBookmarkList`,
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}bookmark`, {
      params: { language: data.language },
    });
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
      thunkAPI.dispatch(
        GetAllArchiveData({
          language: data.language,
          ...data.params,
          keyword: data.search_keyword,
        })
      );
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
    thunkAPI.dispatch(
      GetAllArchiveData({
        language: data.language,
        keyword: data.search_keyword,
        page: data.page,
        limit: data.limit,
      })
    );
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

export const addNewSlide = createAsyncThunk(
  "addNewSlide",
  async (data, thunkAPI) => {
    const response = await axios.post(`${API}slide`, data.list);

    if (response.data.success) {
      showSuccessToast(response.data.description);
    }

    return response.data;
  }
);

export const deleteNewSlide = createAsyncThunk(
  "deleteNewSlide",
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}slide`, {
      data: data.data,
    });

    if (response.data.success) {
      showSuccessToast(response.data.description);
    }

    return response.data;
  }
);

export const updateNewSlide = createAsyncThunk(
  "updateNewSlide",
  async (data, thunkAPI) => {
    const response = await axios.patch(`${API}slide`, data.updateSlideList);

    if (response.data.success) {
      showSuccessToast(response.data.description);
    }

    return response.data;
  }
);

// Define async thunk
export const fetchArchiveData = createAsyncThunk(
  "archive/fetchData",
  async () => {
    const response = await fetch("/api/archive");
    return response.json();
  }
);

const ArchiveSlice = createSlice({
  name: "Archive",
  initialState,
  reducers: {
    emptyAutoComplete: (state, { payload }) => {
      debugLog("emptyAutoComplete action triggered");
      return { ...state, autocomplete: [] };
    },
    updateArchiveList: (state, action) => {
      debugLog("Updating archiveList in reducer with data:", action.payload);
      return { ...state, archiveList: action.payload };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchArchiveData.fulfilled, (state, action) => {
      debugLog("fetchArchiveData.fulfilled - Payload:", action?.payload);
      showSuccessToast("Successfully fetched archive data");
      return { ...state, archiveList: action?.payload };
    });

    builder.addCase(fetchArchiveData.rejected, (state, action) => {
      debugLog("Error fetching archive data:", action?.error);
      showErrorToast("Error fetching archive data: " + action?.error.message);
      return state;
    });

    builder.addCase(GetAllAuthor.fulfilled, (state, { payload }) => {
      debugLog("GetAllAuthor.fulfilled - Payload:", payload);
      return { ...state, authorList: payload };
    });

    builder.addCase(UserBookmarkList.pending, (state) => {
      debugLog("UserBookmarkList.pending - Loading started");
      return { ...state, bookmarkListLoading: true };
    });
    builder.addCase(UserBookmarkList.fulfilled, (state, { payload }) => {
      debugLog("UserBookmarkList.fulfilled - Payload:", payload);
      return { ...state, bookmarkList: payload, bookmarkListLoading: false };
    });

    builder.addCase(BookmarkSlide.fulfilled, (state, { payload }) => {
      debugLog("BookmarkSlide.fulfilled - Payload:", payload);
      return { ...state, bookmarkList: payload };
    });

    builder.addCase(GetAllAuthorList.fulfilled, (state, { payload }) => {
      debugLog("GetAllAuthorList.fulfilled - Payload:", payload);
      return { ...state, getAuthorList: payload };
    });
    builder.addCase(ArchiveAutoComplete.fulfilled, (state, { payload }) => {
      debugLog("GetAllAuthorList.fulfilled - Payload:", payload);
      return { ...state, autocomplete: payload };
    });
    builder.addCase(SlideListWithFildeUid.fulfilled, (state, { payload }) => {
      debugLog("SlideListWithFildeUid.fulfilled - Payload:", payload);
      return { ...state, editSlideList: payload };
    });
  },
});

export const { emptyAutoComplete } = ArchiveSlice.actions;

export const getEditSlideList = (state) =>
  state?.ArchiveList?.editSlideList?.data;
export const getAutocompleteSuggetion = (state) =>
  state?.ArchiveList?.autocomplete?.data;
export const getAllArchiveList = (state) =>
  state?.ArchiveList?.archiveList?.data
    ? state.ArchiveList.archiveList.data
    : state.ArchiveList.archiveList;

export const getAllBookmarkList = (state) =>
  state?.ArchiveList?.bookmarkList?.data;

export const getAllBookmarkListLoading = (state) =>
  state?.ArchiveList?.bookmarkListLoading;

export const getAllAuthorList = (state) =>
  state?.ArchiveList?.getAuthorList?.data;

export const updateSourcePath = createAsyncThunk(
  "updateSourcePath",
  async (data, thunkAPI) => {
    try {
      const response = await axios.patch(
        `${API}source_path_id/${data.sourcePathId}`,
        { source_path: data.sourcePath }
      );

      if (response.data.success) {
        showSuccessToast(response.data.message);
      }

      return response.data;
    } catch (error) {
      showErrorToast(
        `${error.response.data.error} ${error.response.data.description}`
      );
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export default ArchiveSlice.reducer;
