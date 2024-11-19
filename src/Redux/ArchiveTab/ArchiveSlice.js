import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { GetSubtitleData } from "../Subtitle/SubtitleSlice";
import GetLangaugeCode from "../../Utils/Const";
import { MAX_SLIDE_LIMIT } from "../../Utils/Const";

const API = process.env.REACT_APP_API_BASE_URL;
const languages = GetLangaugeCode();

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
  GetByID: "",
  Create: "",
  Update: "",
  Delete: "file-slide",
};

export const GetAllArchiveData = createAsyncThunk(
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
export const DeleteArchive = createAsyncThunk(
  `DeleteArchive`,
  async (data, thunkAPI) => {
    const response = await axios.delete(
      `${API}${
        API_URL.Delete + "/" + data.file_uid + "?force_delete_bookmarks=true"
      }`,
      {}
    );

    thunkAPI.dispatch(
      GetAllArchiveData({
        language: data.language,
        keyword: data.search_keyword,
      })
    );

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
      params: { language: languages[data.language] },
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
    response.data.success && toast.success(response.data.description);
    // thunkAPI.dispatch(GetAllArchiveData({ language: data.language }));
    return response.data;
  }
);

export const deleteNewSlide = createAsyncThunk(
  "deleteNewSlide",
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}slide`, {
      data: data.data,
    });
    // thunkAPI.dispatch(GetAllArchiveData({ language: data.language }));
    response.data.success && toast.success(response.data.description);
    return response.data;
  }
);
export const updateNewSlide = createAsyncThunk(
  "updateNewSlide",
  async (data, thunkAPI) => {
    const response = await axios.patch(`${API}slide`, data.updateSlideList);
    response.data.success && toast.success(response.data.description);
    // thunkAPI.dispatch(GetAllArchiveData({ file_uid: data.file_uid }));
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
      return { ...state, autocomplete: [] };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchArchiveData.fulfilled, (state, action) => {
      toast.success("Successfully fetched archive data");
      return { ...state, archiveList: action?.payload };
    });

    builder.addCase(fetchArchiveData.rejected, (state, action) => {
      toast.error("Something went wrong");
      return state;
    });

    builder.addCase(DeleteArchive.fulfilled, (state, action) => {
      toast.success("Successfully deleted");
      return state;
    });
    builder.addCase(GetAllAuthor.fulfilled, (state, { payload }) => {
      return { ...state, authorList: payload };
    });
    builder.addCase(UserBookmarkList.pending, (state) => {
      return { ...state, bookmarkListLoading: true };
    });
    builder.addCase(UserBookmarkList.fulfilled, (state, { payload }) => {
      return { ...state, bookmarkList: payload, bookmarkListLoading: false };
    });
    builder.addCase(BookmarkSlide.fulfilled, (state, { payload }) => {
      return { ...state, bookmarkList: payload };
    });

    builder.addCase(GetAllAuthorList.fulfilled, (state, { payload }) => {
      return { ...state, getAuthorList: payload };
    });
    builder.addCase(ArchiveAutoComplete.fulfilled, (state, { payload }) => {
      return { ...state, autocomplete: payload };
    });
    builder.addCase(SlideListWithFildeUid.fulfilled, (state, { payload }) => {
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
  state?.ArchiveList?.archiveList?.data;

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
      response.data.success && toast.success(response.data.message);
      return response.data;
    } catch (error) {
      toast.error("Failed to update source path");
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export default ArchiveSlice.reducer;
