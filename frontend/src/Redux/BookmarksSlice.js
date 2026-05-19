import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { showErrorToast } from "../Utils/Common";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  bookmarks: [],
  events: [],
  activeEvent: "",
};

export const GetBookmarkEvents = createAsyncThunk(
  "bookmarks/getEvents",
  async ({ language, channel }) => {
    const response = await axios.get(`${API}bookmark/events`, { params: { language, channel, type: "subtitles" } });
    return response.data.data;
  }
);

export const CreateBookmarkEvent = createAsyncThunk(
  "bookmarks/createEvent",
  async ({ channel, event }, { rejectWithValue }) => {
    try {
      await axios.post(`${API}bookmark/events`, { channel, event, type: "subtitles" });
      return event;
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to create event");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const DeleteBookmarkEvent = createAsyncThunk(
  "bookmarks/deleteEvent",
  async ({ channel, language, event }, { rejectWithValue }) => {
    try {
      await axios.delete(`${API}bookmark/events`, { params: { channel, language, event, type: "subtitles" } });
      return event;
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to delete event");
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
  async ({bookmarks, update, channel, language, event = ""}, thunkAPI) => {
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
          event,
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
    const response = await axios.delete(`${API}bookmark/${data.bookmark_id}`);
    return response.data;
  }
);

const BookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    setActiveEvent(state, action) {
      state.activeEvent = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(GetBookmarks.fulfilled, (state, action) => {
        const { data } = action.payload;
        state.bookmarks = data;
      })
      .addCase(GetBookmarkEvents.fulfilled, (state, action) => {
        state.events = (action.payload || []).filter((e) => e !== "");
      })
      .addCase(CreateBookmarkEvent.fulfilled, (state, action) => {
        const ev = action.payload;
        if (ev && !state.events.includes(ev)) {
          state.events = [...state.events, ev].sort();
        }
      })
      .addCase(DeleteBookmarkEvent.fulfilled, (state, action) => {
        const deleted = action.payload;
        state.events = state.events.filter((e) => e !== deleted);
        if (state.activeEvent === deleted) {
          state.activeEvent = "";
        }
      });
  },
});

export const { setActiveEvent } = BookmarksSlice.actions;
export default BookmarksSlice.reducer;
