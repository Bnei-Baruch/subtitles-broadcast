import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";

const API = "http://localhost:3001/";

const initialState = {
  userProfile: [],
  selectedLang: "en",
};

const UserProfileSlice = createSlice({
  name: "UserProfileSlice",
  initialState,
  reducers: {
    StoreProfile: (state, { payload }) => {
      return { ...state, userProfile: payload };
    },
    SelelectedLang: (state, { payload }) => {
      return { ...state, selectedLang: payload };
    },
  },
  extraReducers: (builder) => {},
});

export const { StoreProfile, SelelectedLang } = UserProfileSlice.actions;

export default UserProfileSlice.reducer;
