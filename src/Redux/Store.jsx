import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { combineReducers } from "redux";
import storage from "redux-persist/lib/storage";
import ArchiveSlice from "./ArchiveTab/ArchiveSlice";
import UserProfileSlice from "./UserProfile/UserProfileSlice";
import SubtitleSlice from "./Subtitle/SubtitleSlice";
import SourceSlice from "./SourceTab/SourceSlice";
import BroadcastParamsReducer from "./BroadcastParams/BroadcastParamsSlice";
import mqttReducer from "./MQTT/mqttSlice";
import UserSettingsReducer from "./UserSettings/UserSettingsSlice";

const persistConfig = {
  key: "root",
  storage,
};

const RootReducer = combineReducers({
  ArchiveList: ArchiveSlice,
  UserProfile: UserProfileSlice,
  SubtitleData: SubtitleSlice,
  SourceList: SourceSlice,
  BroadcastParams: BroadcastParamsReducer,
  mqtt: mqttReducer,
  userSettings: UserSettingsReducer,
});

const persistedReducer = persistReducer(persistConfig, RootReducer);

export const store = configureStore({
  reducer: persistedReducer,
});
