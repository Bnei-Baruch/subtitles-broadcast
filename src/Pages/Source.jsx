import React, { useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import {
  GetAllSourcePathData,
  BookmarkSlideFromArchivePage,
  DeleteSource,
  UserBookmarkList,
  UnBookmarkSlide,
  getAllSourcePathList,
} from "../Redux/SourceTab/SourceSlice";
import { useDispatch, useSelector } from "react-redux";
import MessageBox from "../Components/MessageBox";
import DeleteConfirmation from "../Components/DeleteConfirmation";
import ReactPaginate from "react-paginate";
import { useLocation } from "react-router-dom";
import GetLangaugeCode from "../Utils/Const";
import { Search } from "../Layout/Search";
import { useNavigate } from "react-router-dom";

const Source = () => {
  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );
  const queryParams = new URLSearchParams(useLocation().search);
  const dispatch = useDispatch();
  const sourcePathList = useSelector(getAllSourcePathList);

  const [unbookmarkAction, setUnbookmarkAction] = useState(false);
  const localPagination = localStorage?.getItem("source_pagination")
    ? JSON?.parse(localStorage?.getItem("source_pagination"))
    : { page: 1, limit: 10 };
  const [page, setPage] = useState(localPagination);
  const [pageIndex, setPageIndex] = useState({ startIndex: 1, endIndex: 10 });
  const updatePage = (page, limit) => {
    localStorage.setItem("pagination", JSON.stringify({ page, limit }));
    setPage({ page, limit });
    setPageIndex({
      startIndex: (page - 1) * limit + 1,
      endIndex: Math.min(
        page * limit,
        sourcePathList?.pagination?.total_rows,
        Number.MAX_VALUE
      ),
    });
  };

  const message = "";
  const [SourceUidForDeleteSlide, setSourceUidForDeleteSlide] = useState(
    queryParams.get("source_uid")
  );

  const [toggle, setToggle] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState();
  const [deleteConfirmationPopup, setDeleteConfirmationPopup] = useState(false);
  const [bookmarkData, setBookmarkData] = useState({
    file_uid: "",
    update: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    setPageIndex({
      startIndex: (page.page - 1) * page.limit + 1,
      endIndex: Math.min(
        page.page * page.limit,
        sourcePathList?.pagination?.total_rows,
        Number.MAX_VALUE
      ),
    });
  }, [sourcePathList]);

  useEffect(() => {
    dispatch(
      GetAllSourcePathData({
        language: broadcastLangObj.label,
        page: page.page,
        limit: page.limit,
        keyword: sessionStorage.getItem("headerSearchKeywordSource"),
      })
    );
  }, [page.page, page.limit, broadcastLangObj.label]);

  useEffect(() => {
    if (finalConfirm === true) {
      dispatch(
        DeleteSource({
          search_keyword: sessionStorage.getItem("headerSearchKeywordSource"),
          source_uid: SourceUidForDeleteSlide,
          language: broadcastLangObj.label,
        })
      );
      setFinalConfirm(false);
    }
    if (toggle) {
      dispatch(
        BookmarkSlideFromArchivePage({
          search_keyword: sessionStorage.getItem("headerSearchKeywordSource"),
          data: deleteId,
          language: broadcastLangObj.label,
        })
      );
      setToggle(false);
    }
  }, [finalConfirm, toggle, deleteId, dispatch]);

  const DelectConfirmationModal = useMemo(
    () => (
      <DeleteConfirmation
        confirm={() => setFinalConfirm(true)}
        show={deleteConfirmationPopup}
        handleClose={() => setDeleteConfirmationPopup(false)}
      />
    ),
    [deleteConfirmationPopup]
  );

  const ConfirmationMessage = useMemo(() => {
    if (!unbookmarkAction) {
      return (
        <MessageBox
          setFinalConfirm={() => {
            dispatch(
              BookmarkSlideFromArchivePage({
                search_keyword: sessionStorage.getItem(
                  "headerSearchKeywordSource"
                ),
                data: bookmarkData,
                language: broadcastLangObj.label,
                params: page,
              })
            );
          }}
          message={"Are you sure , you want to bookmark this File slide"}
          show={confirmation}
          handleClose={() => setConfirmation(false)}
        />
      );
    }
  }, [confirmation, message, unbookmarkAction]);

  return (
    <>
      {DelectConfirmationModal}
      {ConfirmationMessage}
      <div
        className="archiveBackground bg-light Edit"
        style={{ position: "relative" }}
      >
        <div className="flex-container">
          <div
            className="flex-box-center top-autocomplete"
            style={{ marginLeft: "10px", marginRight: "10px" }}
          >
            {/* Content for the second flex box centered */}
            <Search className="top-autocomplete" />
            <ReactPaginate
              pageCount={sourcePathList?.pagination?.total_pages}
              onPageChange={(e) => {
                const selectedPage = e.selected + 1;
                if (selectedPage <= sourcePathList?.pagination?.total_pages) {
                  updatePage(selectedPage, page.limit);
                }
              }}
              forcePage={page.page - 1}
              containerClassName="pagination"
              pageClassName="pagination-item"
              previousLabel={
                <i
                  className="bi bi-chevron-left"
                  style={{
                    fontSize: "30px",
                    cursor: page.page === 1 ? "not-allowed" : "pointer",
                    color: page.page === 1 ? "#6c757d" : "black",
                  }}
                />
              }
              nextLabel={
                <i
                  className="bi bi-chevron-right"
                  style={{
                    fontSize: "30px",
                    cursor:
                      page.page === sourcePathList?.pagination?.total_pages
                        ? "not-allowed"
                        : "pointer",
                    color:
                      page.page === sourcePathList?.pagination?.total_pages
                        ? "#6c757d"
                        : "black",
                  }}
                />
              }
              activeClassName="active"
              disabledClassName="disabled"
              breakLabel={null}
              pageRangeDisplayed={0}
              marginPagesDisplayed={0}
            />
          </div>
          <div
            className="flex-box-center"
            onChange={(e) => {
              updatePage(1, +e.target.value);
            }}
          >
            <span>Row per page:</span>
            <select
              value={/*localPagination?.limit ||*/ page.limit}
              className="ms-2"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>{" "}
            &nbsp; &nbsp; &nbsp;
            <span
              style={{ width: "200px" }}
            >{`${pageIndex.startIndex}-${pageIndex.endIndex} of ${sourcePathList?.pagination?.total_rows} `}</span>
          </div>
        </div>
        <div className="card" style={{ border: "none" }}>
          {sourcePathList ? (
            <div style={{ overflowX: "auto" }}>
              <table className="" style={{ padding: "20px", minWidth: "100%" }}>
                <thead>
                  <colgroup>
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <tr>
                    <th style={{ width: "20%", padding: "10px" }}>Path</th>
                    <th style={{ width: "15%", padding: "10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcePathList?.paths?.map((key, index) => (
                    <tr
                      key={key.ID}
                      className={
                        key.bookmark_id !== null ? "bookmarkedrow" : ""
                      }
                    >
                      <td style={{ padding: "10px" }} className="text-truncate">
                        {key.path}
                      </td>
                      <td style={{ padding: "10px" }}>
                        {key.bookmark_id !== null ? (
                          <i
                            onClick={() => {
                              setUnbookmarkAction(true);
                              dispatch(
                                UnBookmarkSlide({
                                  search_keyword: sessionStorage.getItem(
                                    "headerSearchKeywordSource"
                                  ),
                                  bookmark_id: key.bookmark_id,
                                  language: broadcastLangObj.label,
                                  page: page.page,
                                  limit: page.limit,
                                })
                              );
                              setBookmarkData({
                                file_uid: "",
                                update: "",
                              });
                            }}
                            className="bi bi-bookmark-check-fill m-2 cursor-pointer "
                          />
                        ) : (
                          <i
                            onClick={() => {
                              setUnbookmarkAction(false);
                              dispatch(
                                UserBookmarkList({
                                  language: broadcastLangObj.label,
                                })
                              ).then((res) => {
                                let update = false;
                                for (
                                  let i = 0;
                                  i < res.payload.data.length;
                                  i++
                                ) {
                                  if (
                                    res.payload.data[i].slide_id ===
                                    key?.slide_id
                                  ) {
                                    update = true;
                                    break;
                                  }
                                }
                                dispatch(
                                  BookmarkSlideFromArchivePage({
                                    search_keyword: sessionStorage.getItem(
                                      "headerSearchKeywordSource"
                                    ),
                                    data: {
                                      file_uid: key?.file_uid,
                                      slide_id: key?.slide_id,
                                      update: update,
                                      order: sourcePathList?.paths?.find(
                                        (k) => k.bookmark_id !== null
                                      )?.length,
                                    },
                                    language: broadcastLangObj.label,
                                    params: page,
                                  })
                                ).then((res) => {
                                  if (
                                    res.payload ===
                                    "The bookmark with the same file exists"
                                  ) {
                                    setBookmarkData({
                                      file_uid: key?.file_uid,
                                      slide_id: key?.slide_id,
                                      update: true,
                                    });
                                    setConfirmation(true);
                                  }
                                });
                              });
                            }}
                            className="bi bi-bookmark m-2 cursor-pointer "
                          />
                        )}
                        <i
                          className="bi bi-pencil m-2 cursor-pointer "
                          onClick={() => {
                            setUnbookmarkAction(false);
                            navigate(
                              `/archive/edit?file_uid=${key?.file_uid}`,
                              {
                                state: { previousLocation: "/source" }, // Adjust based on actual context
                              }
                            );
                          }}
                        />
                        <i
                          onClick={() => {
                            setUnbookmarkAction(false);
                            setDeleteConfirmationPopup(true);
                            setDeleteId(key.ID);
                            setSourceUidForDeleteSlide(key.source_uid);
                          }}
                          className="bi bi-trash3 m-2 cursor-pointer "
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card d-flex h-auto">
              <div>NO Data</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Source;
