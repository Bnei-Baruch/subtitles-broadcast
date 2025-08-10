import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { showSuccessToast, showErrorToast } from "../Utils/Common";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  sources: [],
  autocomplete: [],
};

export const AutocompleteSources = createAsyncThunk(
  `sources/autocomplete`,
  async (data, thunkAPI) => {
      const response = await axios.get(`${API}auto_complete`, { params: data });
      return response.data;
    }
);

export const GetSources = createAsyncThunk(
  "sources/get",
  async (data, thunkAPI) => {
    const response = await axios.get(`${API}source_path`, { params: data });
    return response.data;
  }
);

export const DeleteSource = createAsyncThunk(
  "sources/delete",
  async ({ hidden, forever, path, source_uid }, thunkAPI) => {
    const undeleteParam = hidden ? "&undelete=true" : "";
    const foreverParam = forever ? "&forever=true" : "";
    const debug = path ? "&debug_path=" + encodeURIComponent(path) : "";
    const response = await axios.delete(
      `${API}${"source-slide/" + source_uid + "?force_delete_bookmarks=true" + undeleteParam + foreverParam + debug}`
    );
    return {undelete: hidden, forever, success: response.data.success};
  }
);

const SourceSlice = createSlice({
  name: "Source",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(GetSources.fulfilled, (state, action) => {
      return { ...state, sources: action.payload.data };
    });
    builder.addCase(DeleteSource.rejected, (state, action) => {
      showErrorToast("Error deleting or fetching: " + action.error.message);
      return state;
    });
    builder.addCase(DeleteSource.fulfilled, (state, action) => {
      const {undelete, forever, success} = action.payload;
      let msg = "deleted";
      if (undelete) {
        msg = "undeleted";
      } else if (forever) {
        msg = "deleted forever"
      }
      if (success) {
        showSuccessToast("Successfully " + msg);
      } else {
        showErrorToast("Failed making source " + msg);
      }
      return state;
    });
		builder.addCase(AutocompleteSources.fulfilled, (state, { payload }) => {
			return { ...state, autocomplete: payload.data };
		});
  },
});
export const { emptyAutoComplete } = SourceSlice.actions;

export default SourceSlice.reducer;
