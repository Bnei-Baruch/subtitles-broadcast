import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { showSuccessToast, showErrorToast } from "../Utils/Common";

const API = process.env.REACT_APP_API_BASE_URL;

export const KARAOKE_GROUPS = ["songbook", "shabat", "origin", "general"];

const initialState = {
  songs: [],
  setlist: [],
  slides: [],
  activeSongFileUid: null,
  activeSlideIndex: null,
  activeGroup: "",
  karaokeEvents: [],
  activeKaraokeEvent: "",
};

export const GetKaraokeSongs = createAsyncThunk("karaoke/getSongs", async ({ group = "", showHidden = false } = {}) => {
  const params = { source_type: group, ...(showHidden && { show_hidden: "true" }) };
  const response = await axios.get(`${API}source_path`, { params });
  return response.data.data;
});

export const RestoreKaraokeSong = createAsyncThunk("karaoke/restoreSong", async ({ source_uid }, { rejectWithValue }) => {
  try {
    const response = await axios.delete(`${API}source-slide/${source_uid}?type=karaoke&undelete=true&force_delete_bookmarks=true`);
    if (response.data.success) {
      showSuccessToast("Song restored");
    }
    return source_uid;
  } catch (err) {
    showErrorToast(err.response?.data?.description || "Restore failed");
    return rejectWithValue(err.response?.data);
  }
});

export const GetKaraokeSlides = createAsyncThunk("karaoke/getSlides", async ({ file_uid }) => {
  const response = await axios.get(`${API}karaoke/slides`, { params: { file_uid } });
  return response.data.data;
});

export const ImportKaraokeFile = createAsyncThunk("karaoke/import", async ({ formData }, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API}karaoke/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response.data.success) {
      showSuccessToast(`Imported: ${response.data.data.slide_count} slides`);
    }
    return response.data.data;
  } catch (err) {
    showErrorToast(err.response?.data?.description || "Import failed");
    return rejectWithValue(err.response?.data);
  }
});

export const DeleteKaraokeSong = createAsyncThunk("karaoke/deleteSong", async ({ source_uid }, { rejectWithValue }) => {
  try {
    const response = await axios.delete(`${API}source-slide/${source_uid}?type=karaoke&force_delete_bookmarks=true`);
    if (response.data.success) {
      showSuccessToast("Song moved to recycle bin");
    }
    return source_uid;
  } catch (err) {
    showErrorToast(err.response?.data?.description || "Delete failed");
    return rejectWithValue(err.response?.data);
  }
});

export const UpdateKaraokeSongName = createAsyncThunk(
  "karaoke/updateSongName",
  async ({ sourcePathId, name, sourceUid }, { rejectWithValue }) => {
    try {
      await axios.patch(`${API}source_path_id/${sourcePathId}`, { source_path: name });
      showSuccessToast("Song name updated");
      return { sourceUid, name };
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to update song name");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const GetKaraokeEvents = createAsyncThunk("karaoke/getEvents", async ({ channel }) => {
  const response = await axios.get(`${API}bookmark/events`, { params: { channel, type: "karaoke" } });
  return response.data.data;
});

export const GetKaraokeSetlist = createAsyncThunk("karaoke/getSetlist", async ({ channel, event = "" }) => {
  const response = await axios.get(`${API}bookmark`, { params: { channel, event, type: "karaoke" } });
  return response.data.data;
});

export const AddToSetlist = createAsyncThunk("karaoke/addToSetlist", async ({ file_uid, channel, event = "" }, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API}bookmark`, { file_uid, channel, event, type: "karaoke" });
    return response.data.data;
  } catch (err) {
    showErrorToast(err.response?.data?.description || err.response?.data?.err || "Failed to add to setlist");
    return rejectWithValue(err.response?.data);
  }
});

export const RemoveFromSetlist = createAsyncThunk("karaoke/removeFromSetlist", async ({ id }) => {
  await axios.delete(`${API}bookmark/${id}`);
  return id;
});

export const ReorderSetlist = createAsyncThunk("karaoke/reorderSetlist", async ({ items }) => {
  await axios.patch(`${API}bookmark/reorder`, items);
  return items;
});

export const CreateKaraokeEvent = createAsyncThunk("karaoke/createEvent", async ({ channel, event }, { rejectWithValue }) => {
  try {
    await axios.post(`${API}bookmark/events`, { channel, event, type: "karaoke" });
    return event;
  } catch (err) {
    showErrorToast(err.response?.data?.description || "Failed to create event");
    return rejectWithValue(err.response?.data);
  }
});

export const DeleteKaraokeEvent = createAsyncThunk("karaoke/deleteEvent", async ({ channel, event }, { rejectWithValue }) => {
  try {
    await axios.delete(`${API}bookmark/events`, { params: { channel, event, type: "karaoke" } });
    return event;
  } catch (err) {
    showErrorToast(err.response?.data?.description || "Failed to delete event");
    return rejectWithValue(err.response?.data);
  }
});

export const ReorderKaraokeSlides = createAsyncThunk(
  "karaoke/reorderSlides",
  async ({ slides }, { rejectWithValue }) => {
    try {
      const updates = slides.map((s, idx) => ({
        slide_id: s.ID ?? s.id,
        slide: s.slide,
        order_number: idx,
        left_to_right: s.left_to_right,
        slide_type: s.slide_type,
        renderer: s.renderer || "default",
      }));
      await axios.patch(`${API}slide`, updates);
      return slides.map((s, idx) => ({ ...s, order_number: idx }));
    } catch (err) {
      showErrorToast("Failed to reorder slides");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const UpdateKaraokeSlide = createAsyncThunk(
  "karaoke/updateSlide",
  async ({ slide_id, slide, order_number, left_to_right, slide_type, renderer }, { rejectWithValue }) => {
    try {
      await axios.patch(`${API}slide`, [{ slide_id, slide, order_number, left_to_right, slide_type, renderer }]);
      return { slide_id, slide };
    } catch (err) {
      showErrorToast("Failed to update slide");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const DeleteKaraokeSlide = createAsyncThunk(
  "karaoke/deleteSlide",
  async ({ slide_id }, { rejectWithValue }) => {
    try {
      await axios.delete(`${API}slide`, { data: { slide_ids: [slide_id], force_delete_bookmarks: true } });
      return slide_id;
    } catch (err) {
      showErrorToast("Failed to delete slide");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const AddKaraokeSlide = createAsyncThunk(
  "karaoke/addSlide",
  async ({ file_uid, order_number }, { rejectWithValue }) => {
    try {
      await axios.post(`${API}slide`, [{
        file_uid,
        slide: "",
        order_number,
        left_to_right: true,
        slide_type: "karaoke",
        renderer: "default",
      }]);
      return { file_uid };
    } catch (err) {
      showErrorToast("Failed to add slide");
      return rejectWithValue(err.response?.data);
    }
  }
);

export const RenameKaraokeEvent = createAsyncThunk("karaoke/renameEvent", async ({ channel, event, new_event }, { rejectWithValue }) => {
  try {
    await axios.patch(`${API}bookmark/events`, { channel, event, new_event, type: "karaoke" });
    return { event, new_event };
  } catch (err) {
    showErrorToast(err.response?.data?.description || "Failed to rename event");
    return rejectWithValue(err.response?.data);
  }
});

const KaraokeSlice = createSlice({
  name: "karaoke",
  initialState,
  reducers: {
    setActiveSong(state, action) {
      state.activeSongFileUid = action.payload;
      state.activeSlideIndex = null;
      state.slides = [];
    },
    setActiveSlideIndex(state, action) {
      state.activeSlideIndex = action.payload;
    },
    clearKaraokeSlides(state) {
      state.slides = [];
      state.activeSongFileUid = null;
      state.activeSlideIndex = null;
    },
    setActiveGroup(state, action) {
      state.activeGroup = action.payload;
    },
    setActiveKaraokeEvent(state, action) {
      state.activeKaraokeEvent = action.payload;
      state.setlist = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(GetKaraokeSongs.fulfilled, (state, action) => {
        state.songs = action.payload || [];
      })
      .addCase(UpdateKaraokeSongName.fulfilled, (state, action) => {
        const { sourceUid, name } = action.payload;
        const song = state.songs.find((s) => s.source_uid === sourceUid);
        if (song) song.path = name;
      })
      .addCase(GetKaraokeSlides.fulfilled, (state, action) => {
        state.slides = action.payload || [];
      })
      .addCase(ImportKaraokeFile.fulfilled, (state) => {
        // Songs list refreshed separately via GetKaraokeSongs dispatch
      })
      .addCase(DeleteKaraokeSong.fulfilled, (state, action) => {
        const sourceUid = action.payload;
        state.songs = state.songs.filter((s) => s.source_uid !== sourceUid);
        state.setlist = state.setlist.filter((s) => s.file_uid !== sourceUid);
        if (state.activeSongFileUid === sourceUid) {
          state.activeSongFileUid = null;
          state.slides = [];
          state.activeSlideIndex = null;
        }
      })
      .addCase(RestoreKaraokeSong.fulfilled, (state, action) => {
        const sourceUid = action.payload;
        state.songs = state.songs.filter((s) => s.source_uid !== sourceUid);
      })
      .addCase(GetKaraokeEvents.fulfilled, (state, action) => {
        state.karaokeEvents = action.payload || [];
      })
      .addCase(CreateKaraokeEvent.fulfilled, (state, action) => {
        const ev = action.payload;
        if (ev && !state.karaokeEvents.includes(ev)) {
          state.karaokeEvents = [...state.karaokeEvents, ev].sort();
        }
      })
      .addCase(GetKaraokeSetlist.fulfilled, (state, action) => {
        state.setlist = action.payload || [];
      })
      .addCase(AddToSetlist.fulfilled, (state, action) => {
        if (action.payload) {
          const item = action.payload;
          state.setlist = [...state.setlist, { ...item, id: item.id ?? item.ID }];
        }
      })
      .addCase(RemoveFromSetlist.fulfilled, (state, action) => {
        state.setlist = state.setlist.filter((item) => item.id !== action.payload);
      })
      .addCase(ReorderSetlist.fulfilled, (state, action) => {
        const orderMap = {};
        action.payload.forEach(({ id, order_number }) => {
          orderMap[id] = order_number;
        });
        state.setlist = [...state.setlist]
          .map((item) => ({ ...item, order_number: orderMap[item.id] ?? item.order_number }))
          .sort((a, b) => a.order_number - b.order_number);
      })
      .addCase(DeleteKaraokeEvent.fulfilled, (state, action) => {
        const deleted = action.payload;
        state.karaokeEvents = state.karaokeEvents.filter((e) => e !== deleted);
        if (state.activeKaraokeEvent === deleted) {
          state.activeKaraokeEvent = "";
          state.setlist = [];
        }
      })
      .addCase(ReorderKaraokeSlides.fulfilled, (state, action) => {
        state.slides = action.payload;
      })
      .addCase(UpdateKaraokeSlide.fulfilled, (state, action) => {
        const { slide_id, slide } = action.payload;
        const idx = state.slides.findIndex((s) => (s.ID ?? s.id) === slide_id);
        if (idx !== -1) state.slides[idx] = { ...state.slides[idx], slide };
      })
      .addCase(DeleteKaraokeSlide.fulfilled, (state, action) => {
        state.slides = state.slides.filter((s) => (s.ID ?? s.id) !== action.payload);
      })
      .addCase(RenameKaraokeEvent.fulfilled, (state, action) => {
        const { event, new_event } = action.payload;
        state.karaokeEvents = state.karaokeEvents.map((e) => (e === event ? new_event : e));
        if (state.activeKaraokeEvent === event) {
          state.activeKaraokeEvent = new_event;
        }
      });
  },
});

export const { setActiveSong, setActiveSlideIndex, clearKaraokeSlides, setActiveGroup, setActiveKaraokeEvent } = KaraokeSlice.actions;
export default KaraokeSlice.reducer;
