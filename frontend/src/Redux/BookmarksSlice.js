import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { makePresetThunks } from "./presetThunks";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  bookmarks: [],
  presets: [],
  activePreset: "",
};

const presetThunks = makePresetThunks("bookmarks", "subtitles", { withLanguage: true });
export const GetBookmarkPresets = presetThunks.getPresets;
export const CreateBookmarkPreset = presetThunks.createPreset;
export const DeleteBookmarkPreset = presetThunks.deletePreset;

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


// Persists the current bookmark order in one transactional PATCH; called on
// drop, after moveBookmark() has reordered the list locally during the drag.
export const ReorderBookmarks = createAsyncThunk(
  "bookmarks/reorder",
  async (_, { getState }) => {
    const items = getState().bookmarks.bookmarks.map((b, i) => ({ id: b.bookmark_id, order_number: i }));
    await axios.patch(`${API}bookmark/reorder`, items);
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
    // Local-only reorder while dragging; no API call.
    moveBookmark(state, action) {
      const { from, to } = action.payload;
      const [moved] = state.bookmarks.splice(from, 1);
      state.bookmarks.splice(to, 0, moved);
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

export const { setActivePreset, moveBookmark } = BookmarksSlice.actions;
export default BookmarksSlice.reducer;
