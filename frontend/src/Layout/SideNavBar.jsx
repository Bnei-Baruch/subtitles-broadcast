import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import "./Layout.css";
import HeaderBar from "../Layout/HeaderBar";
import { isOperator, isTranslator } from "../Utils/Auth";
import MqttLogsDialog from "../Components/MqttLogsDialog";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import LibraryMusicOutlinedIcon from "@mui/icons-material/LibraryMusicOutlined";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";

const SideNavBar = ({ logout, securityRoles, authKeycloak }) => {
  const [mqttDialogOpen, setMqttDialogOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sideNavCollapsed") === "true"
  );
  const toggleCollapsed = () => {
    localStorage.setItem("sideNavCollapsed", String(!collapsed));
    setCollapsed(!collapsed);
  };
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  return (
    <>
      <div className={`side-menu${collapsed ? " collapsed" : ""}`}>
        <div
          className="d-flex flex-column flex-shrink-0"
          style={{ width: collapsed ? "64px" : "260px" }}
        >
          <div className="d-flex align-items-center admin-row">
            <a href="/" className="d-flex admin-main flex-grow-1" title="BNEI BARUCH — ADMIN SUBTITLES">
              <div className="img-src">
                <img alt="user" src="image/user.png" />
              </div>
              {!collapsed && (
                <div className="fs-4">
                  BNEI BARUCH<span>ADMIN SUBTITLES</span>
                </div>
              )}
            </a>
            <button
              className="collapse-toggle"
              onClick={toggleCollapsed}
              title={collapsed ? "Expand menu" : "Collapse menu"}
            >
              {collapsed ? <KeyboardDoubleArrowRightIcon fontSize="small" /> : <KeyboardDoubleArrowLeftIcon fontSize="small" />}
            </button>
          </div>

          <ul className="nav nav-pills flex-column mb-auto">
            {isOperator(securityRoles) && (
              <li className="nav-item">
                <NavLink
                  to={"/subtitle"}
                  className="nav-link text-white"
                  aria-current="page"
                  title="Subtitles"
                >
                  <img alt="dashboard" src="image/dashboard.svg" />{" "}
                  <span className="nav-label">Subtitles</span>
                </NavLink>
              </li>
            )}

            {isOperator(securityRoles) && broadcastLangCode === "he" && (
              <li>
                <NavLink to={"/karaoke"} className="nav-link text-white" title="Karaoke">
                  <LibraryMusicOutlinedIcon className="nav-icon" />{" "}
                  <span className="nav-label">Karaoke</span>
                </NavLink>
              </li>
            )}

            {isOperator(securityRoles) && (
              <li>
                <NavLink to={"/archive"} className="nav-link text-white" title="Archive">
                  <img alt="folder" src="image/folder-special.svg" />{" "}
                  <span className="nav-label">Archive</span>
                </NavLink>
              </li>
            )}

            {isOperator(securityRoles) && (
              <li>
                <NavLink to={"/source"} className="nav-link text-white" title="Source">
                  <img alt="folder" src="image/folder-special.svg" />{" "}
                  <span className="nav-label">Source</span>
                </NavLink>
              </li>
            )}

            {isOperator(securityRoles) && (
              <li>
                <NavLink to={"/new"} className="nav-link text-white" title="New">
                  <img alt="queue" src="image/queue.svg" />{" "}
                  <span className="nav-label">New</span>
                </NavLink>
              </li>
            )}

            {isTranslator(securityRoles) && (
              <li>
                <NavLink to={"/question"} className="nav-link text-white" title="Question">
                  <img alt="slider" src="image/sliders.svg" />{" "}
                  <span className="nav-label">Question</span>
                </NavLink>
              </li>
            )}
          </ul>

          <HeaderBar logout={authKeycloak} />
          <span
            className="nav-link text-white show-mqtt-logs"
            title="Show MQTT Logs"
            onClick={() => setMqttDialogOpen(true)}
          >
            <ArticleOutlinedIcon sx={{ mr: 1 }} />
          </span>
        </div>
      </div>

      <MqttLogsDialog
        open={mqttDialogOpen}
        onClose={() => setMqttDialogOpen(false)}
      />
    </>
  );
};

export default SideNavBar;
