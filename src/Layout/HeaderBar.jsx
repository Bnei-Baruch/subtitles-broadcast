import React from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const HeaderBar = () => {
  const userProfile = useSelector(
    (state) => state?.UserProfile?.userProfile?.profile
  );
  // const [selectedLang, setSelectedLang] = useState("en");

  return (
    <>
      <div className="main-body">
        <div className="top-header d-flex justify-content-between">
          <input
            className="form-control me-2"
            type="search"
            placeholder="Search"
            aria-label="Search"
            style={{ visibility: "hidden" }}
          />
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
                  src="image/account-circle.svg"
                  id="dropdownMenuButton1"
                  data-bs-toggle="dropdown"
                />
                <span className="m-2">{userProfile?.firstName}</span>
              </button>
              <ul className="dropdown-menu">
                <li>Menu item</li>
                <li>Menu item</li>
                <li>
                  <span
                    className="dropdown-item"
                    onClick={() => userProfile?.logout()}
                  >
                    Logout
                  </span>
                </li>
              </ul>
            </div>
            <div className="btn-group list-btn">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
              >
                <img
                  alt="button"
                  className=""
                  src="image/Globe.svg"
                  id="dropdownMenuButton1"
                  data-bs-toggle="dropdown"
                />
                <span className="m-2">EN</span>
              </button>
              <ul className="dropdown-menu">
                <li>Menu item</li>
                <li>Menu item</li>
                <li>Menu item</li>
              </ul>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </>
  );
};

export default HeaderBar;
