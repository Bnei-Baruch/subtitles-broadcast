import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HeaderBar from "../Layout/HeaderBar";
import Subtitles from "../Pages/Subtitles";
import Archive from "../Pages/Archive";

const MainRoutes = ({ logout }) => {
  return (
    <>
      <Routes>
        {/** Protected Routes */}
        {/** Wrap all Route under ProtectedRoutes element */}
        <Route element={<HeaderBar logout={logout} />}>
          <Route index element={<Navigate to={"/subtitle"} />} />
          <Route path="/subtitle" element={<Subtitles />} />
          <Route path="/archive" element={<Archive />} />
          {/** Public Routes */}
          {/** Wrap all Route under PublicRoutes element */}
          {/* <Route path="login" element={<PublicRoutes />}>
			<Route path="/login" element={<Login />} />
		</Route> */}
        </Route>
        {/** Permission denied route */}
        {/* <Route path="/denied" element={<PermissionDenied />} /> */}
      </Routes>
    </>
  );
};

export default MainRoutes;
