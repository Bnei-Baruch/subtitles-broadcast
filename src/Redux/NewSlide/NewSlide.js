import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;

const API_URL = {
  SetCustomSlideBySource: "custom_slide_by_source",
  GetSlideLanguages: "slide_language",
};

export const SetCustomSlideBySource = createAsyncThunk(
  `/${API_URL.SetCustomSlideBySource}`,
  async (data, thunkAPI) => {
    let requestBody;
    let languages;
    if (data.languages.length > 1) {
      languages = data.languages
    } else {
      languages = [data.languages]
    }

    if (data.name.length > 0) {
      requestBody = {
        // Your request body data here
        file_name: data.name,
        languages: languages,
        source_uid: data.source_uid,
        file_uid: data.file_uid,
        slides: data.slides
        };
    } else {
      requestBody = {
        // Your request body data here
        languages: languages,
        source_uid: data.source_uid,
        file_uid: data.file_uid,
        slides: data.slides
        };
    }
    const response = await axios.post(`${API}custom_slide`, requestBody);
    return response.data;
  }
);

export const GetSlideLanguages = createAsyncThunk(
  `/${API_URL.GetSlideLanguages}`,
  async (data, thunkAPI) => {
      const response = await axios.get(`${API}slide_language`);
      return response.data;
  }
);