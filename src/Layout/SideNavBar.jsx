import React from "react";
import { NavLink } from "react-router-dom";
import "./Layout.css";
import HeaderBar from "../Layout/HeaderBar";

const SideNavBar = ({ logout, securityRole, authKeycloak }) => (
  <>
    <div className="side-menu">
      <div
        className="d-flex flex-column flex-shrink-0  "
        style={{ width: "260px" }}
      >
        <a href="/" className="d-flex admin-main ">
          <div className="img-src">
            <img alt="user" src="image/user.png" />
          </div>
          <div className="fs-4">
            BNEI BARUCH<span>ADMIN SUBTITLES</span>
          </div>
        </a>

        <ul className="nav nav-pills flex-column mb-auto">
          {securityRole && securityRole !== "translator" && (
            <li className="nav-item">
              <NavLink
                to={"/subtitle"}
                className="nav-link text-white "
                aria-current="page"
              >
                <img alt="dashboard" src="image/dashboard.svg" /> Subtitles
              </NavLink>
            </li>
          )}

          {securityRole && securityRole !== "translator" && (
            <li>
              <NavLink to={"/archive"} className="nav-link text-white">
                <img alt="folder" src="image/folder-special.svg" /> Archive
              </NavLink>
            </li>
          )}

          {securityRole && securityRole !== "translator" && (
            <li>
              <NavLink to={"/source"} className="nav-link text-white">
                <img alt="folder" src="image/folder-special.svg" /> Source
              </NavLink>
            </li>
          )}

          {securityRole && securityRole !== "translator" && (
            <li>
              <NavLink to={"/new"} className="nav-link text-white">
                <img alt="queue" src="image/queue.svg" /> New
              </NavLink>
            </li>
          )}

          {securityRole && securityRole !== "operator" && (
            <li>
              <NavLink to={"/question"} className="nav-link text-white">
                <img alt="slider" src="image/sliders.svg" />
                Question
              </NavLink>
            </li>
          )}
        </ul>

        <HeaderBar logout={authKeycloak} />
      </div>
    </div>
  </>
);

export default SideNavBar;
