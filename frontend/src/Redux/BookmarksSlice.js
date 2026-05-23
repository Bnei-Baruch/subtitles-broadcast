import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { showErrorToast } from "../Utils/Common";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  bookmarks: [],
  presets: [],
  activePreset: "",
};

export const GetBookmarkPresets = createAsyncThunk(
  "bookmarks/getPresets",
  async ({ language, channel }) => {
    const response = await axios.get(`${API}bookmark/presets`, { params: { language, channel, type: "subtitles" } });
    return response.data.data;
  }
);

export const CreateBookmarkPreset = createAsyncThunk(
  "bookmarks/createPreset",
  async ({ channel, preset }, { rejectWithValue }) => {
    try {
      await axios.post(`${API}bookmark/presets`, { channel, preset, type: "subtitles" });
      return preset;
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to create preset");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const DeleteBookmarkPreset = createAsyncThunk(
  "bookmarks/deletePreset",
  async ({ channel, language, preset }, { rejectWithValue }) => {
    try {
      await axios.delete(`${API}bookmark/presets`, { params: { channel, language, preset, type: "subtitles" } });
      return preset;
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to delete preset");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const GetBookmarks = createAsyncThunk(
  `bookmarks/get`,
  async (params, thunkAPI) => {
    const response = await axios.get(`${API}bookmark`, { params: { type: "subtitles", ...params } });
    return response.data;
  }
);

// Adds or updates bookmarks.
export const UpdateBookmarks = createAsyncThunk(
  "bookmarks/update",
  async ({bookmarks, update, channel, language, preset = ""}, thunkAPI) => {
    const updatedBookmarks = [];
    try {
      for (const bookmark of bookmarks) {
        const response = await axios.post(`${API}bookmark`, {
          type: "subtitles",
          file_uid: bookmark.file_uid,
          slide_id: bookmark.slide_id,
          order_number: bookmark.order_number !== undefined ? bookmark.order_number : undefined,
          update,
          channel,
          language,
          preset,
        });
        updatedBookmarks.push(response.data);
      };
      return updatedBookmarks;
    } catch (error) {
      return error.response.data.description;
    }
  }
);


// Delete bookmark.
export const UnBookmarkSlide = createAsyncThunk(
  "bookmarks/delete",
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}bookmark/${data.bookmark_id}`);
    return response.data;
  }
);

const BookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    setActivePreset(state, action) {
      state.activePreset = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(GetBookmarks.fulfilled, (state, action) => {
        const { data } = action.payload;
        state.bookmarks = data;
      })
      .addCase(GetBookmarkPresets.fulfilled, (state, action) => {
        state.presets = (action.payload || []).filter((p) => p !== "");
      })
      .addCase(CreateBookmarkPreset.fulfilled, (state, action) => {
        const p = action.payload;
        if (p && !state.presets.includes(p)) {
          state.presets = [...state.presets, p].sort();
        }
      })
      .addCase(DeleteBookmarkPreset.fulfilled, (state, action) => {
        const deleted = action.payload;
        state.presets = state.presets.filter((p) => p !== deleted);
        if (state.activePreset === deleted) {
          state.activePreset = "";
        }
      });
  },
});

export const { setActivePreset } = BookmarksSlice.actions;
export default BookmarksSlice.reducer;
