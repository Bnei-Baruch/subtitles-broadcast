import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { showErrorToast } from "../Utils/Common";

const API = process.env.REACT_APP_API_BASE_URL;

// Subtitles and karaoke presets share the /bookmark/presets endpoints, differing
// only by `type` and whether `language` scopes the query. This factory builds the
// get/create/delete/rename thunks for either, so the two slices don't duplicate them.
export function makePresetThunks(typePrefix, type, { withLanguage = false } = {}) {
  const getPresets = createAsyncThunk(`${typePrefix}/getPresets`, async ({ language, channel }) => {
    const params = { channel, type, ...(withLanguage ? { language } : {}) };
    const response = await axios.get(`${API}bookmark/presets`, { params });
    return response.data.data;
  });

  const createPreset = createAsyncThunk(`${typePrefix}/createPreset`, async ({ channel, preset }, { rejectWithValue }) => {
    try {
      await axios.post(`${API}bookmark/presets`, { channel, preset, type });
      return preset;
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to create preset");
      return rejectWithValue(err.response?.data);
    }
  });

  const deletePreset = createAsyncThunk(`${typePrefix}/deletePreset`, async ({ channel, language, preset }, { rejectWithValue }) => {
    try {
      const params = { channel, preset, type, ...(withLanguage ? { language } : {}) };
      await axios.delete(`${API}bookmark/presets`, { params });
      return preset;
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to delete preset");
      return rejectWithValue(err.response?.data);
    }
  });

  const renamePreset = createAsyncThunk(`${typePrefix}/renamePreset`, async ({ channel, preset, new_preset }, { rejectWithValue }) => {
    try {
      await axios.patch(`${API}bookmark/presets`, { channel, preset, new_preset, type });
      return { preset, new_preset };
    } catch (err) {
      showErrorToast(err.response?.data?.description || "Failed to rename preset");
      return rejectWithValue(err.response?.data);
    }
  });

  return { getPresets, createPreset, deletePreset, renamePreset };
}
