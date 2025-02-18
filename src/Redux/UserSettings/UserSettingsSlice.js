import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import debugLog from "../../Utils/debugLog";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  userSettings: {}, // Stores all user settings
  loading: false,
};

export const fetchUserSettings = createAsyncThunk(
  "userSettings/fetchUserSettings",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API}user/settings`);
      return response.data.data; // Expecting JSON object from backend
    } catch (error) {
      debugLog("❌ fetchUserSettings Error:", error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.description || "Unknown error"
      );
    }
  }
);

export const updateUserSettings = createAsyncThunk(
  "userSettings/updateUserSettings",
  async (updatedSettings, thunkAPI) => {
    debugLog("🚀 Updating User Settings", updatedSettings);
    try {
      await axios.post(`${API}user/settings`, updatedSettings);
      return updatedSettings;
    } catch (error) {
      debugLog("❌ updateUserSettings Error:", error);
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
  (newSettings) => (dispatch, getState) => {
    if (!newSettings) {
      newSettings = {};
    }

    const currentSettings = getState().userSettings.userSettings || {};
    const updatedSettings = { ...currentSettings, ...newSettings };

    debugLog("🚀 Merging and updating user settings:", updatedSettings);
    dispatch(updateUserSettings(updatedSettings));
  };

const UserSettingsSlice = createSlice({
  name: "userSettings",
  initialState,
  reducers: {
    setLastSelectedFileUId(state, action) {
      state.last_selected_file_uid = action.payload;
    },
    setLastSelectedSlideId(state, action) {
      state.last_selected_slide_id = action.payload;
    },
    setSettings(state, action) {
      const currentSettings = state || {};
      const updatedSettings = { ...currentSettings, ...(action.payload || {}) };
      state = updatedSettings;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserSettings.fulfilled, (state, action) => {
      debugLog("✅ User Settings Loaded", action.payload);
      state.userSettings = action.payload;
    });

    builder.addCase(updateUserSettings.fulfilled, (state, action) => {
      debugLog("🛠️ User Settings Updated", action.payload);
      state.userSettings = { ...state.userSettings, ...action.payload };
    });
  },
});

export const { setLastSelectedFileUId, setLastSelectedSlideId, setSettings } =
  UserSettingsSlice.actions;

export default UserSettingsSlice.reducer;
