import React, { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  GetAllArchiveData,
} from "../Redux/ArchiveTab/ArchiveSlice";
import useDebounce from "../Services/useDebounce";
import BroadcastSettings from "../Components/BroadcastSettings";
import AppContext from "../AppContext";
import {
  GetAllSourcePathData,
} from "../Redux/SourceTab/SourceSlice";

const HeaderBar = ({ logout }) => {
  const appContextlData = useContext(AppContext);
  const dispatch = useDispatch();
  const param = useLocation();

  const localPagination = localStorage?.getItem("pagination")
    ? JSON?.parse(localStorage?.getItem("pagination"))
    : { page: 1, limit: 10 };
  const localFreeText = localStorage?.getItem("free-text") && "";
  const [freeText, setFreeText] = useState(localFreeText);
  const updateFreeText = (t) => {
    setFreeText(t);
    localStorage?.setItem("free-text", t);
  }
  const DebouncingFreeText = useDebounce(freeText, 500);
  useEffect(() => {
    if (param.pathname !== "/archive") {
      updateFreeText("");
    }
  }, [param.pathname]);

  useEffect(() => {
    if (param.pathname === "/archive") {
      localStorage.setItem(
        "pagination",
        JSON.stringify({ page: 1, limit: localPagination?.limit })
      );
      dispatch(
        GetAllArchiveData({
          language: appContextlData.broadcastLang.label,
          limit: localPagination.limit,
          page: localPagination.page,
          keyword: freeText,
        })
      );
    } else if (param.pathname === "/source") {
      localStorage.setItem(
        "pagination",
        JSON.stringify({ page: 1, limit: localPagination?.limit })
      );
      dispatch(
        GetAllSourcePathData({
          language: appContextlData.broadcastLang.label,
          limit: localPagination.limit,
          page: localPagination.page,
          keyword: freeText,
        })
      );
    }
  }, [DebouncingFreeText, dispatch, freeText, param.pathname]);

  return (
    <>
      <div className="top-header d-flex justify-content-between ">
        <div className="form-group col-3 autoComplete">
          {param.pathname === "/archive" &&
            <input
              placeholder="Search"
              value={freeText}
              onKeyDown={(e) => {
                e.key === "Enter" &&
                  dispatch(
                    GetAllArchiveData({
                      language: appContextlData.broadcastLang.label,
                      limit: localPagination.limit,
                      page: localPagination.page,
                      keyword: freeText,
                    })
                  );
              }}
              onChange={(e) => {
                console.log("hi");
                localStorage.setItem("headerSearchKeyword", e.target.value);
                updateFreeText(e.target.value);
              }}
              type="text"
              className="form-control input"
            />
          }
          {param.pathname === "/source" &&
            <input
              placeholder="Search"
              value={freeText}
              onKeyDown={(e) => {
                e.key === "Enter" &&
                  dispatch(
                    GetAllSourcePathData({
                      language: appContextlData.broadcastLang.label,
                      limit: localPagination.limit,
                      page: localPagination.page,
                      keyword: freeText,
                    })
                  );
              }}
              onChange={(e) => {
                console.log("hi2");
                localStorage.setItem("headerSearchKeyword", e.target.value);
                updateFreeText(e.target.value);
              }}
              type="text"
              className="form-control input"
            />
          }
          <div></div>
        </div >
        <div className="d-flex aligne-item-center">
          <div className="btn-group list-btn">
            <BroadcastSettings></BroadcastSettings>
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
          </div>
          {/* <div className="btn-group list-btn">
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
          </div> */}
        </div>
      </div >
    </>
  );
};

export default HeaderBar;
