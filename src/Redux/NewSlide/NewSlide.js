import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;

const API_URL = {
  SetCustomSlideBySource: "custom_slide_by_source",
};

export const SetCustomSlideBySource = createAsyncThunk(
  `/${API_URL.SetCustomSlideBySource}`,
  async (data, thunkAPI) => {
    const requestBody = {
        // Your request body data here
        languages: [data.languages],
        slides: data.slides
    };
    const response = await axios.post(`${API}custom_slide`, requestBody);
    return response.data;
  }
);