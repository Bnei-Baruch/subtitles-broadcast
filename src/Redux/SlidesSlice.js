import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

import { showSuccessToast, showErrorToast } from "../Utils/Common";

const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  slides: [],
  total: null,
  lastModified: null,
};

const LIMIT = 1000;

export const GetSlides = createAsyncThunk(
  'slides/get',
  async ({ reset = true, all = true, language, keyword, file_uid, limit = undefined }, { getState }) => {
    console.log('GetSlides', reset, all, language, keyword, file_uid, limit);
    const { slides } = getState().slides;
    const offsetParams = all ? {} : { offset: reset ? 0 : slides.length, limit: limit || LIMIT };
    const response = await axios.get(`${API}slide`, {
      params: { language, keyword, file_uid, ...offsetParams },
    });
    return { data: response.data.data, reset };
  }
);

export const AddSlide = createAsyncThunk(
  "slides/post",
  async (data, thunkAPI) => {
    const response = await axios.post(`${API}slide`, data);

    if (response.data.success) {
      showSuccessToast(response.data.description);
    }

    return response.data;
  }
);

export const DeleteSlide = createAsyncThunk(
  "slides/delete",
  async (data, thunkAPI) => {
    const response = await axios.delete(`${API}slide`, { data });

    if (response.data.success) {
      showSuccessToast(response.data.description);
    }

    return response.data;
  }
);

export const UpdateSlide = createAsyncThunk(
  "slides/patch",
  async (data, thunkAPI) => {
    const response = await axios.patch(`${API}slide`, data);

    if (response.data.success) {
      showSuccessToast(response.data.description);
    }

    return response.data;
  }
);

export const UpdateSourcePath = createAsyncThunk(
  "source_path/patch",
  async (data, thunkAPI) => {
    try {
			console.log('Patch source path', data);
      const response = await axios.patch(
       `${API}source_path_id/${data.sourcePathId}`,
        { source_path: data.sourcePath }
      );

      if (response.data.success) {
        showSuccessToast(response.data.message);
      }

      return response.data;
    } catch (error) {
      showErrorToast(
        `${error.response.data.error} ${error.response.data.description}`
      );
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const SlidesSlice = createSlice({
  name: "slides",
  initialState,
  reducers: {
    clearSlices: (state) => {
      state.slides = [];
    }
  },
  extraReducers: (builder) => {
    builder.addCase(GetSlides.fulfilled, (state, action) => {
      const { data, reset } = action.payload;

      console.log('fulfilled', data, reset);

      if (reset || data.last_modified !== state.lastModified) {
        // Reset.
        state.slides = data.slides;
        state.total = data.total;
        state.lastModified = data.last_modified;
      } else {
        // Append, update object.
        state.slides = [...state.slides, ...data.slides];
      }
    });
  },
});

export const { clearSlices } = SlidesSlice.actions;
export default SlidesSlice.reducer;
