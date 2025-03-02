import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import debugLog from "../../Utils/debugLog";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  userSettings: {
    selected_slide_id: null,
    selected_file_uid: null,
    selected_bookmark_language: null,
    broadcast_programm_code: "morning_lesson",
    broadcast_language_code: "he",
    source_pagination: { page: 1, limit: 10 },
    archive_pagination: { page: 1, limit: 10 },
    file_uid_for_edit_slide: null,
    bookmar_id_for_edit: null,
    slide_id_for_edit: null,
  },
  loading: false,
  isLoaded: false,
};

export const fetchUserSettings = createAsyncThunk(
  "userSettings/fetchUserSettings",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API}user/settings`);
      return response.data.data;
    } catch (error) {
      debugLog("fetchUserSettings Error:", error);

      if (error.response?.status === 404) {
        debugLog("User settings not found. Creating initial settings...");
        thunkAPI.dispatch(createInitialUserSettings());
      }

      return thunkAPI.rejectWithValue(
        error.response?.data?.description || "Unknown error"
      );
    }
  }
);

/**
 * Merges new settings with existing settings before updating the backend.
 * @param {Object} newSettings - The settings being updated (only changed values).
 * @param {Function} dispatch - Redux dispatch function.
 * @param {Object} getState - Function to get the current Redux state.
 */
export const updateMergedUserSettings =
  (newSettings) => async (dispatch, getState) => {
    if (!newSettings) return;

    const currentSettings = getState().userSettings.userSettings || {};
    const updatedSettings = { ...currentSettings, ...newSettings };

    if (newSettings.selected_file_uid) {
      updatedSettings.selected_bookmark_language =
        updatedSettings.broadcast_language_code;
    }

    debugLog("Merging and updating user settings:", updatedSettings);

    try {
      await axios.post(`${API}user/settings`, updatedSettings);
      dispatch(setSettings(updatedSettings));
    } catch (error) {
      debugLog("updateMergedUserSettings Error:", error);
    }
  };

/**
 * Creates initial user settings in the database by using updateMergedUserSettings.
 */
export const createInitialUserSettings = () => (dispatch, getState) => {
  const initialSettings = getState().userSettings.userSettings;
  debugLog("Creating initial user settings:", initialSettings);
  dispatch(updateMergedUserSettings(initialSettings));
};

const UserSettingsSlice = createSlice({
  name: "userSettings",
  initialState,
  reducers: {
    setSettings(state, action) {
      state.userSettings = { ...state.userSettings, ...action.payload };
      state.isLoaded = true;
    },
    updateSettingsInternal(state, action) {
      state.userSettings = { ...state.userSettings, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserSettings.fulfilled, (state, action) => {
      debugLog("User Settings Loaded", action.payload);
      state.userSettings = action.payload;
      state.isLoaded = true;
    });
  },
});

export const { setSettings, updateSettingsInternal } =
  UserSettingsSlice.actions;
export default UserSettingsSlice.reducer;
