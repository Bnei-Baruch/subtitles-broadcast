import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Subtitles from "../Pages/Subtitles";
import Archive from "../Pages/Archive";
import NewSlides from "../Pages/NewSlides";

const MainRoutes = ({ logout }) => {
  return (
    <>
      <Routes>
        {/** Protected Routes */}
        {/** Wrap all Route under ProtectedRoutes element */}

        <Route index element={<Navigate to={"/subtitle"} />} />
        <Route path="/subtitle" element={<Subtitles />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/new" element={<NewSlides />} />
        {/** Public Routes */}
        {/** Wrap all Route under PublicRoutes element */}
        {/* <Route path="login" element={<PublicRoutes />}>
			<Route path="/login" element={<Login />} />
	
        {/* </Route> */}
        {/** Permission denied route */}
        {/* <Route path="/denied" element={<PermissionDenied />} /> */}
      </Routes>
    </>
  );
};

export default MainRoutes;
