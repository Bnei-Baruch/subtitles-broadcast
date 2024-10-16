import React from "react";
import { useLocation } from "react-router-dom";
import BroadcastSettings from "../Components/BroadcastSettings";

const HeaderBar = ({ logout }) => {
  const param = useLocation();

  return (
    <>
      <div
        className={`top-header d-flex justify-content-between page-${param.pathname.replace(
          "/",
          ""
        )}`}
      >
        <div className="d-flex aligne-item-center">
          <div className="btn-group list-btn">
            <button
              className="btn btn-secondary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <img
                alt="button"
                className=""
                src="/image/user_icon.svg"
                id="dropdownMenuButton1"
                data-bs-toggle="dropdown"
              />
              <span className="m-2">{logout?.profile?.firstName}</span>
            </button>
            <ul className="dropdown-menu">
              <li>
                <span
                  className="dropdown-item cursor-pointer"
                  onClick={() => logout?.logout()}
                >
                  Logout
                </span>
              </li>
            </ul>
            <BroadcastSettings></BroadcastSettings>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderBar;
