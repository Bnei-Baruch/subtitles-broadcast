import { createAsyncThunk,createSlice } from "@reduxjs/toolkit";
import axios from "axios";


const API_URL={
    GetALL:"books",
    GetByID:'',
    Create:'',
    Update:"",
    Delete:''
}






export const GetAllData=createAsyncThunk(
    `/${API_URL.GetALL}`,
    async (data, thunkAPI) => {
        const response = await axios.get(`${process.env.REACT_API_URL}${API_URL.GetALL}`)
        return response.data
      }
    )



const Books=createSlice(
    
)    