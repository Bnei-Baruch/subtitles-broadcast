import React, { useContext, useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import {
  BookmarkSlideFromArchivePage,
  DeleteArchive,
  GetAllArchiveData,
  SlideListWithFildeUid,
  UnBookmarkSlide,
  UserBookmarkList,
  getAllArchiveList,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import MessageBox from "../Components/MessageBox";
import DeleteConfirmation from "../Components/DeleteConfirmation";
import EditArcive from "./EditArchive";
import ReactPaginate from "react-paginate";
import { Slide } from "../Components/Slide";
import { useLocation } from "react-router-dom";
import AppContext from "../AppContext";

const Archive = () => {
  const appContextlData = useContext(AppContext);
  const queryParams = new URLSearchParams(useLocation().search);
  const dispatch = useDispatch();
  const archiveList = useSelector(getAllArchiveList);

  const [unbookmarkAction, setUnbookmarkAction] = useState(false)
  const localPagination = localStorage?.getItem("pagination")
    ? JSON?.parse(localStorage?.getItem("pagination"))
    : { page: 1, limit: 10 };
  const [page, setPage] = useState(localPagination);
  const [pageIndex, setPageIndex] = useState({ startIndex: 1, endIndex: 10 });
  const updatePage = (page, limit) => {
    localStorage.setItem("pagination", JSON.stringify({ page, limit }));
    setPage({ page, limit });
    setPageIndex({
      startIndex: ((page - 1) * limit) + 1,
      endIndex: Math.min((page) * limit, archiveList?.pagination?.total_rows, Number.MAX_VALUE),
    });
  };

  const message = "";
  const [editSlide, setEditSlide] = useState("");
  const [fileUidForDeleteSlide, setFileUidForDeleteSlide] = useState(
    queryParams.get("file_uid")
  );
  const [fileUidForEditSlide, setFileUidForEditSlide] = useState(
    queryParams.get("file_uid")
  );

  const [toggle, setToggle] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState();
  const [deleteConfirmationPopup, setDeleteConfirmationPopup] = useState(false);
  const [bookmarkData, setBookmarkData] = useState({
    file_uid: "",
    slide_id: "",
    update: "",
    order: "",
  });
  // const [bookmarkId, setBookmarkId] = useState();

  useEffect(() => {
    dispatch(
      GetAllArchiveData({
        language: appContextlData.broadcastLang.label,
        page: page.page,
        limit: page.limit,
        keyword: localStorage?.getItem("free-text"),
      })
    );
  }, [page.page, page.limit, appContextlData.broadcastLang.label]);

  useEffect(() => {
    if (finalConfirm === true) {
      dispatch(
        DeleteArchive({
          search_keyword: localStorage.getItem("headerSearchKeyword"),
          file_uid: fileUidForDeleteSlide,
          language: appContextlData.broadcastLang.label
        })
      );
      setFinalConfirm(false);
    }
    if (toggle) {
      dispatch(BookmarkSlideFromArchivePage({
        search_keyword: localStorage.getItem("headerSearchKeyword"),
        data: deleteId,
        language: appContextlData.broadcastLang.label
      }));
      setToggle(false);
    }
  }, [finalConfirm, toggle, deleteId, dispatch]);

  useEffect(() => {
    if (fileUidForEditSlide !== null) {
      dispatch(
        SlideListWithFildeUid({
          file_uid: fileUidForEditSlide,
          limit: 2000,
        })
      ).then((response) => {
        setEditSlide(response.payload.data.slides[0].ID);
      });
    }
  }, [fileUidForEditSlide]);

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

  const ConfirmationMessage = useMemo(
    () => {
      if (!unbookmarkAction) {
        return (
          <MessageBox
            setFinalConfirm={() => {
              dispatch(
                BookmarkSlideFromArchivePage({
                  data: bookmarkData,
                  language: appContextlData.broadcastLang.label,
                  params: { page: page.page, limit: page.limit },
                })
              );
            }}
            message={"Are you sure , you want to bookmark this File slide"}
            show={confirmation}
            handleClose={() => setConfirmation(false)}
          />
        );
      }
    },
    [confirmation, message, unbookmarkAction]
  );

  return (
    <>
      {DelectConfirmationModal}
      {ConfirmationMessage}
      {editSlide ? (
        <EditArcive handleClose={() => setEditSlide(false)} />
      ) : (
        <div className="archiveBackground  bg-light Edit">
          <div className="card" style={{ border: "none", height: "calc(100vh - 175px)" }}>
            {archiveList ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  className=""
                  style={{ padding: "20px", minWidth: "100%" }}
                >
                  <thead>
                    <colgroup>
                      <col style={{ width: "65%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <tr>
                      <th style={{ width: "65%", padding: "10px" }}>Text</th>
                      <th style={{ width: "20%", padding: "10px" }}>Path</th>
                      <th style={{ width: "15%", padding: "10px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveList?.slides?.map((key, index) => (
                      <tr
                        key={key.ID}
                        className={
                          key.bookmark_id !== null ? "bookmarkedrow" : ""
                        }
                      >
                        <td style={{ padding: "10px" }}>
                          <div className="" style={{ outline: "solid", position: "relative" }}>
                            <Slide content={key.slide} isLtr={key.left_to_right} />
                          </div>
                        </td>
                        <td
                          style={{ padding: "10px" }}
                          className="text-truncate"
                        >
                          {key.languages.length > 1 ? `(${key.languages[index % key.languages.length]}) ${key.slide_source_path}` : key.slide_source_path}
                        </td>
                        <td style={{ padding: "10px" }}>
                          {key.bookmark_id !== null ? (
                            <i
                              onClick={() => {
                                setUnbookmarkAction(true);
                                dispatch(
                                  UnBookmarkSlide({
                                    search_keyword: localStorage.getItem("free-text"),
                                    bookmark_id: key.bookmark_id,
                                    language: appContextlData.broadcastLang.label
                                  })
                                );
                                setBookmarkData({
                                  file_uid: "",
                                  slide_id: "",
                                  update: "",
                                  order: "",
                                });
                              }}
                              className="bi bi-bookmark-check-fill m-2 cursor-pointer "
                            />
                          ) : (
                            <i
                              onClick={() => {
                                setUnbookmarkAction(false);
                                dispatch(
                                  BookmarkSlideFromArchivePage({
                                    search_keyword: localStorage.getItem("free-text"),
                                    data: {
                                      file_uid: key?.file_uid,
                                      slide_id: key?.ID,
                                      update: false,
                                      order: archiveList?.slides?.find(
                                        (k) => k.bookmark_id !== null
                                      )?.length
                                    },
                                    language: appContextlData.broadcastLang.label,
                                    params: {
                                      page: page.page,
                                      limit: page.limit,
                                    },
                                  })
                                ).then((res) => {
                                  if (
                                    res.payload ===
                                    "The bookmark with the same file exists"
                                  ) {
                                    setBookmarkData({
                                      file_uid: key?.file_uid,
                                      slide_id: key?.ID,
                                      update: true,
                                    });
                                    setConfirmation(true);
                                  }
                                });
                              }}
                              className="bi bi-bookmark m-2 cursor-pointer "
                            />
                          )}
                          <i
                            className="bi bi-pencil m-2 cursor-pointer "
                            onClick={() => {
                              setUnbookmarkAction(false);
                              dispatch(
                                SlideListWithFildeUid({
                                  file_uid: key?.file_uid,
                                  limit: 2000,
                                })
                              );
                              setEditSlide(key.ID);
                            }}
                          />
                          <i
                            onClick={() => {
                              setUnbookmarkAction(false);
                              setDeleteConfirmationPopup(true);
                              setDeleteId(key.ID);
                              setFileUidForDeleteSlide(key.file_uid);
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
          <div className="flex-container">
            <div
              className="flex-box-start"
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
              <span>{`${pageIndex.startIndex}-${pageIndex.endIndex} of ${archiveList?.pagination?.total_rows} `}</span>
            </div>
            <div className="flex-box-center">
              {/* Content for the second flex box centered */}
              <ReactPaginate
                pageCount={archiveList?.pagination?.total_pages}
                onPageChange={(e) => {
                  const selectedPage = e.selected + 1;
                  if (selectedPage <= archiveList?.pagination?.total_pages) {
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
                      fontSize: "40px",
                      cursor: page.page === 1 ? "not-allowed" : "pointer",
                      color: page.page === 1 ? "#6c757d" : "black",
                    }}
                  />
                }
                nextLabel={
                  <i
                    className="bi bi-chevron-right"
                    style={{
                      fontSize: "40px",
                      cursor:
                        page.page === archiveList?.pagination?.total_pages
                          ? "not-allowed"
                          : "pointer",
                      color:
                        page.page === archiveList?.pagination?.total_pages
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
          </div>
        </div>
      )}
    </>
  );
};

export default Archive;
