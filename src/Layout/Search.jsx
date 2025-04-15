import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { GetAllArchiveData } from "../Redux/ArchiveTab/ArchiveSlice";
import useDebounce from "../Services/useDebounce";
import { GetAllSourcePathData } from "../Redux/SourceTab/SourceSlice";
import { useSelector } from "react-redux";

export const Search = ({showDeleted}) => {
  const dispatch = useDispatch();
  const param = useLocation();

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  let localPagination;
  if (param.pathname === "/archive") {
    localPagination = localStorage?.getItem("pagination")
      ? JSON?.parse(localStorage?.getItem("pagination"))
      : { page: 1, limit: 10 };
  } else if (param.pathname === "/source") {
    localPagination = localStorage?.getItem("source_pagination")
      ? JSON?.parse(localStorage?.getItem("source_pagination"))
      : { page: 1, limit: 10 };
  }
  const localFreeText = localStorage?.getItem("free-text") && "";
  const [freeText, setFreeText] = useState(localFreeText);
  const updateFreeText = (t) => {
    setFreeText(t);
    localStorage?.setItem("free-text", t);
  };

  const DebouncingFreeText = useDebounce(freeText, 500);
  useEffect(() => {
    updateFreeText("");
  }, [param.pathname]);

  useEffect(() => {
    if (
      param.pathname === "/archive" &&
      (DebouncingFreeText || "").trim() !== localStorage.getItem("free-text")
    ) {
      localStorage.setItem(
        "pagination",
        JSON.stringify({ page: 1, limit: localPagination?.limit })
      );
      dispatch(
        GetAllArchiveData({
          language: broadcastLangCode,
          limit: localPagination.limit,
          page: localPagination.page,
          keyword: freeText,
          hidden: showDeleted ? 'true' : undefined,
        })
      ).then((response) => {
        dispatch({
          type: "Archive/updateArchiveList",
          payload: response.payload.data,
        });
      });
      localStorage.setItem("headerSearchKeyword", "");
    } else if (
      param.pathname === "/source" &&
      (DebouncingFreeText || "").trim() !== localStorage.getItem("free-text")
    ) {
      localStorage.setItem(
        "source_pagination",
        JSON.stringify({ page: 1, limit: localPagination?.limit })
      );
      dispatch(
        GetAllSourcePathData({
          language: broadcastLangCode,
          limit: localPagination.limit,
          page: localPagination.page,
          keyword: freeText,
        })
      );
      //sessionStorage.setItem("headerSearchKeywordSource", "");
    }
  }, [
    DebouncingFreeText,
    broadcastLangCode,
    dispatch,
    freeText,
    localPagination.limit,
    localPagination.page,
    param.pathname,
  ]);

  return (
    <>
      <div className="form-group col-3 autoComplete">
        {param.pathname === "/archive" && (
          <input
            placeholder="Search"
            value={freeText}
            onKeyDown={(e) => {
              e.key === "Enter" &&
                dispatch(
                  GetAllArchiveData({
                    language: broadcastLangCode,
                    limit: localPagination.limit,
                    page: localPagination.page,
                    keyword: freeText,
                  })
                );
              sessionStorage.setItem("headerSearchKeyword", "");
            }}
            onChange={(e) => {
              sessionStorage.setItem("headerSearchKeyword", e.target.value);
              updateFreeText(e.target.value);
            }}
            type="text"
            className="form-control input"
          />
        )}
        {param.pathname === "/source" && (
          <input
            placeholder="Search"
            value={freeText}
            onKeyDown={(e) => {
              e.key === "Enter" &&
                dispatch(
                  GetAllSourcePathData({
                    language: broadcastLangCode,
                    limit: localPagination.limit,
                    page: localPagination.page,
                    keyword: freeText,
                  })
                );
              //sessionStorage.setItem("headerSearchKeywordSource", "");
            }}
            onChange={(e) => {
              sessionStorage.setItem(
                "headerSearchKeywordSource",
                e.target.value
              );
              updateFreeText(e.target.value);
            }}
            type="text"
            className="form-control input"
          />
        )}
      </div>
    </>
  );
};
