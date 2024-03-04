import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArchiveAutoComplete,
  GetAllArchiveData,
  getAutocompleteSuggetion,
} from "../Redux/ArchiveTab/ArchiveSlice";
import useDebounce from "../Services/useDebounce";
import Archive from "../Pages/Archive";

const HeaderBar = ({ logout }) => {
  const dispatch = useDispatch();
  const param = useLocation();
  const ActocompleteList = useSelector(getAutocompleteSuggetion);
  const [showAutocompleteBox, setShowAutocompleteBox] = useState(false);
  const [freeText, setFreeText] = useState("");
  const DebouncingFreeText = useDebounce(freeText, 500);
  useEffect(() => {
    if (param.pathname == "/archive") {
      dispatch(
        GetAllArchiveData({
          language: "en",
          limit: 10,
          page: 1,
          keyword: freeText,
        })
      );
    }
    dispatch(ArchiveAutoComplete({ query: freeText }));
  }, [DebouncingFreeText]);

  return (
    <>
      <div className="top-header d-flex justify-content-between ">
        <div className="form-group col-3 autoComplete">
          <input
            placeholder="Search"
            onBlur={() => setShowAutocompleteBox(false)}
            value={freeText}
            onKeyDown={(e) => {
              e.key === "Enter" &&
                dispatch(
                  GetAllArchiveData({
                    language: "en",

                    keyword: freeText,
                  })
                );
            }}
            onChange={(e) => {
              setShowAutocompleteBox(true);
              setFreeText(e.target.value);
            }}
            type="text"
            className="form-control input"
          />
          {showAutocompleteBox && (
            <ul class="suggestions" id="suggestions">
              {ActocompleteList?.map((suggestion, index) => (
                <li
                // key={index}
                // onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.source_value}
                </li>
              ))}
            </ul>
          )}

          <div></div>
        </div>
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
              <span className="m-2">{logout?.profile?.firstName}</span>
            </button>
            <ul className="dropdown-menu">
              <li>Menu item</li>
              <li>Menu item</li>
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
    </>
  );
};

export default HeaderBar;
