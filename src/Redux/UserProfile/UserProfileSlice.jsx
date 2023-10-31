import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";

const API = "http://localhost:3001/"; 

const initialState = {
  userProfile: [],
};




const UserProfileSlice = createSlice({
  name: "UserProfileSlice",
  initialState,
  reducers: {
    StoreProfile:(state,{payload})=>{
        
return {...state,userProfile:payload}
    }
  },
  extraReducers: (builder) => {
    
  },
});


export const {StoreProfile} = UserProfileSlice.actions

export default UserProfileSlice.reducer;
