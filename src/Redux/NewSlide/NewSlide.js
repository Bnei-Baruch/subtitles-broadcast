import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;

const API_URL = {
  SetCustomSlideBySource: "custom_slide_by_source"
//  GetSlideLanguages: "slide_language",
};

export const SetCustomSlideBySource = createAsyncThunk(
  `/${API_URL.SetCustomSlideBySource}`,
  async (data, thunkAPI) => {
    let languages;
    if (typeof data.languages === "string") {
      languages = [data.languages];
    } else {
      languages = data.languages;
    }
    const requestBody = {
      // Your request body data here
      file_name: data.name,
      languages: languages,
      source_path: data.source_path,
      source_uid: data.source_uid,
      file_uid: data.file_uid,
      left_to_right: data.left_to_right,
      slides: data.slides,
    };
    try {
      const response = await axios.post(`${API}custom_slide`, requestBody);
      return response.data;
    } catch (error) {
      return error.response.data;
    }
  }
);

// export const GetSlideLanguages = createAsyncThunk(
//   `/${API_URL.GetSlideLanguages}`,
//   async (data, thunkAPI) => {
//     const response = await axios.get(`${API}slide_language`);
//     return response.data;
//   }
// );