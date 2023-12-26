import { createSlice } from "@reduxjs/toolkit";
//Below commented Code will use in future
// const API = process.env.REACT_APP_API_BASE_URL;

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
