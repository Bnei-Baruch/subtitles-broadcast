import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { combineReducers } from "redux";
import storage from "redux-persist/lib/storage";
import SlidesSlice from "./SlidesSlice";
import BookmarksSlice from "./BookmarksSlice";
import UserProfileSlice from "./UserProfile/UserProfileSlice";
import SubtitleSlice from "./Subtitle/SubtitleSlice";
import SourceSlice from "./SourceSlice";
import mqttReducer from "./MQTT/mqttSlice";
import UserSettingsReducer from "./UserSettingsSlice";

const persistConfig = {
  key: "root",
  storage,
};

const RootReducer = combineReducers({
  slides: SlidesSlice,
  bookmarks: BookmarksSlice,
  UserProfile: UserProfileSlice,
  SubtitleData: SubtitleSlice,
  sources: SourceSlice,
  mqtt: mqttReducer,
  userSettings: UserSettingsReducer,
});

const persistedReducer = persistReducer(persistConfig, RootReducer);

export const store = configureStore({
  reducer: persistedReducer,
});
