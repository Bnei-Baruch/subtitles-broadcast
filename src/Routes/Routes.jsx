import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Subtitles from "../Pages/Subtitles";
import Archive from "../Pages/Archive";
import Source from "../Pages/Source";
import NewSlides from "../Pages/NewSlides";
import QuestionsModule from "../Pages/QuestionModule";
import EditArchive from "../Pages/EditArchive";
import Settings from "../Pages/Settings";

const MainRoutes = ({ logout, securityRole }) => {
  return (
    <>
      <Routes>
        {/** Protected Routes */}
        {/** Wrap all Route under ProtectedRoutes element */}
        {securityRole && securityRole !== "translator" && (
          <>
            <Route index element={<Navigate to={"/subtitle"} />} />
            <Route path="/subtitle" element={<Subtitles />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/archive/edit" element={<EditArchive />} />
            <Route path="/source" element={<Source />} />
            <Route path="/new" element={<NewSlides />} />
          </>
        )}

        {securityRole && securityRole !== "operator" && (
          <Route path="/question" element={<QuestionsModule />} />
        )}

        {securityRole && <Route path="/settings" element={<Settings />} />}

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
