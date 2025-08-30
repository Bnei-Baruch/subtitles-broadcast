import { createSlice } from "@reduxjs/toolkit";
//Below commented Code will use in future
// const API = process.env.REACT_APP_API_BASE_URL;

const initialState = {
  userProfile: {},
};

const UserProfileSlice = createSlice({
  name: "UserProfileSlice",
  initialState,
  reducers: {
    StoreProfile: (state, { payload }) => {
      console.log('StoreProfile', payload);
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          ...payload.profile,
        },
      };
    },
  },

  extraReducers: (builder) => {},
});

export const { StoreProfile } = UserProfileSlice.actions;

export default UserProfileSlice.reducer;
