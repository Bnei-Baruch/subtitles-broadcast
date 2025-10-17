import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Layout.css";
import HeaderBar from "../Layout/HeaderBar";
import { isOperator, isTranslator, isAdmin } from "../Utils/Auth";
import MqttLogsDialog from "../Components/MqttLogsDialog";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";

const SideNavBar = ({ logout, securityRoles, authKeycloak }) => {
  const [mqttDialogOpen, setMqttDialogOpen] = useState(false);

  return (
    <>
      <div className="side-menu">
        <div
          className="d-flex flex-column flex-shrink-0"
          style={{ width: "260px" }}
        >
          <a href="/" className="d-flex admin-main">
            <div className="img-src">
              <img alt="user" src="image/user.png" />
            </div>
            <div className="fs-4">
              BNEI BARUCH<span>ADMIN SUBTITLES</span>
            </div>
          </a>

          <ul className="nav nav-pills flex-column mb-auto">
            {isOperator(securityRoles) && (
              <li className="nav-item">
                <NavLink
                  to={"/subtitle"}
                  className="nav-link text-white"
                  aria-current="page"
                >
                  <img alt="dashboard" src="image/dashboard.svg" /> Subtitles
                </NavLink>
              </li>
            )}

            {isOperator(securityRoles) && (
              <li>
                <NavLink to={"/archive"} className="nav-link text-white">
                  <img alt="folder" src="image/folder-special.svg" /> Archive
                </NavLink>
              </li>
            )}

            {isOperator(securityRoles) && (
              <li>
                <NavLink to={"/source"} className="nav-link text-white">
                  <img alt="folder" src="image/folder-special.svg" /> Source
                </NavLink>
              </li>
            )}

            {isOperator(securityRoles) && (
              <li>
                <NavLink to={"/new"} className="nav-link text-white">
                  <img alt="queue" src="image/queue.svg" /> New
                </NavLink>
              </li>
            )}

            {isTranslator(securityRoles) && (
              <li>
                <NavLink to={"/question"} className="nav-link text-white">
                  <img alt="slider" src="image/sliders.svg" /> Question
                </NavLink>
              </li>
            )}

            {isAdmin(securityRoles) && (
              <li>
                <NavLink to={"/admin/roles"} className="nav-link text-white">
                  <img alt="settings" src="image/settings.svg" /> Admin
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
