import {configureStore, createSerializableStateInvariantMiddleware, createSlice} from '@reduxjs/toolkit'
import {persistReducer} from 'redux-persist'
import {combineReducers} from 'redux'
import storage from 'redux-persist/lib/storage'
import ArchiveSlice from './ArchiveTab/ArchiveSlice'
import UserProfileSlice from './UserProfile/UserProfileSlice'

const persistConfig = {
    key: 'root',
    storage,
  }


const RootReducer=combineReducers({
ArchiveList:ArchiveSlice,
UserProfile:UserProfileSlice,
})


const persistedReducer = persistReducer(persistConfig, RootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  
})