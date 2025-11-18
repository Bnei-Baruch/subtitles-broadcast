import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  bookmarks: [],
};

export const GetBookmarks = createAsyncThunk(
  `bookmarks/get`,
  async (params, thunkAPI) => {
    const response = await axios.get(`${API}bookmark`, { params });
    return response.data;
  }
);

// Adds or updates bookmarks.
export const UpdateBookmarks = createAsyncThunk(
  "bookmarks/update",
  async ({bookmarks, update, channel, language, return_lsn}, thunkAPI) => {
    const updatedBookmarks = [];
    const lsn = return_lsn ? "?return_lsn=true" : "";
    try {
      for (const bookmark of bookmarks) {
        const response = await axios.post(`${API}bookmark${lsn}`, {
          file_uid: bookmark.file_uid,
          slide_id: bookmark.slide_id,
          // Update order number of bookmark only if explicitly set.
          order_number: bookmark.order_number !== undefined ? bookmark.order_number : undefined,
          // If false, will create a bookmark, otherwise update.
          update,
          channel,
          language,
        });
        updatedBookmarks.push(response.data);
      };
      return updatedBookmarks;
    } catch (error) {
      return error.response.data.description; // This will be available as action.error.message
    }
  }
);


// Delete bookmark.
export const UnBookmarkSlide = createAsyncThunk(
  "bookmarks/delete",
  async (data, thunkAPI) => {
    const lsn = data.return_lsn ? "?return_lsn=true" : "";
    const response = await axios.delete(`${API}bookmark/${data.bookmark_id}${lsn}`);
    return response.data;
  }
);

const BookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(GetBookmarks.fulfilled, (state, action) => {
      const { data } = action.payload;
      state.bookmarks = data;
    });
  },
});

export default BookmarksSlice.reducer;
