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
import { Search } from "../Layout/Search";
import { useNavigate } from "react-router-dom";
import {
  updateMergedUserSettings,
  updateSettingsInternal,
} from "../Redux/UserSettings/UserSettingsSlice";

const Source = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  const queryParams = new URLSearchParams(useLocation().search);
  const sourcePathList = useSelector(getAllSourcePathList);
  const [unbookmarkAction, setUnbookmarkAction] = useState(false);

  const userSettingsPagination = useSelector(
    (state) => state.userSettings.userSettings.source_pagination
  );

  const memoizedPagination = useMemo(
    () => userSettingsPagination || { page: 1, limit: 10 },
    [userSettingsPagination]
  );

  const [page, setPage] = useState(memoizedPagination);

  const message = "";
  const [SourceUidForDeleteSlide, setSourceUidForDeleteSlide] = useState(
    queryParams.get("source_uid")
  );

  const [toggle, setToggle] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState();
  const [deleteIdHidden, setDeleteIdHidden] = useState(false);
  const [deleteIdForever, setDeleteIdForever] = useState(false);
  const [deleteConfirmationPopup, setDeleteConfirmationPopup] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [bookmarkData, setBookmarkData] = useState({
    file_uid: "",
    update: "",
  });

  const [pageIndex, setPageIndex] = useState(() => ({
    startIndex:
      ((userSettingsPagination?.page || 1) - 1) *
        (userSettingsPagination?.limit || 10) +
      1,
    endIndex: Math.min(
      (userSettingsPagination?.page || 1) *
        (userSettingsPagination?.limit || 10),
      Number.MAX_VALUE
    ),
  }));

  const updatePage = (targetPage, targetLimit) => {
    if (
      targetPage === memoizedPagination.page &&
      targetLimit === memoizedPagination.limit
    )
      return;

    dispatch(
      updateMergedUserSettings({
        source_pagination: { page: targetPage, limit: targetLimit },
      })
    );

    setPage({ page: targetPage, limit: targetLimit });

    setPageIndex({
      startIndex: (targetPage - 1) * targetLimit + 1,
      endIndex: Math.min(
        targetPage * targetLimit,
        sourcePathList?.pagination?.total_rows || Number.MAX_VALUE
      ),
    });
  };

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
        language: broadcastLangCode,
        page: page.page,
        limit: page.limit,
        keyword: sessionStorage.getItem("headerSearchKeywordSource"),
        hidden: showDeleted ? "true" : undefined,
      })
    );
  }, [page.page, page.limit, broadcastLangCode, showDeleted]);

  useEffect(() => {
    if (finalConfirm === true) {
      dispatch(
        DeleteSource({
          search_keyword: sessionStorage.getItem("headerSearchKeywordSource"),
          source_uid: SourceUidForDeleteSlide,
          language: broadcastLangCode,
          page: page.page,
          limit: page.limit,
          hidden: deleteIdHidden ? "true" : undefined,
          forever: deleteIdForever ? "true" : undefined,
          showDeleted: showDeleted ? "true" : undefined,
        })
      );
      setFinalConfirm(false);
      setDeleteIdHidden(false);
      setDeleteIdForever(false);
    }
    if (toggle) {
      dispatch(
        BookmarkSlideFromArchivePage({
          search_keyword: sessionStorage.getItem("headerSearchKeywordSource"),
          data: deleteId,
          language: broadcastLangCode,
        })
      );
      setToggle(false);
    }
  }, [
    finalConfirm,
    toggle,
    deleteId,
    deleteIdHidden,
    dispatch,
    deleteIdForever,
  ]);

  const DelectConfirmationModal = useMemo(
    () => (
      <DeleteConfirmation
        undelete={deleteIdHidden}
        forever={deleteIdForever}
        confirm={() => {
          setFinalConfirm(true);
          setDeleteConfirmationPopup(false);
        }}
        show={deleteConfirmationPopup}
        handleClose={() => {
          setDeleteConfirmationPopup(false);
          setDeleteIdHidden(false);
          setDeleteIdForever(false);
        }}
      />
    ),
    [deleteConfirmationPopup, deleteIdHidden, deleteIdForever]
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
                language: broadcastLangCode,
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

  const handleEditSlide = (slide) => {
    const fileUid = slide.file_uid;
    const slideId = slide.slide_id;
    const editUrl = `/archive/edit?file_uid=${fileUid}&slide_id=${slideId}`;

    dispatch(
      updateSettingsInternal({
        file_uid_for_edit_slide: fileUid,
        bookmar_id_for_edit: slide.bookmark_id,
      })
    );

    navigate(editUrl, {
      state: { previousLocation: window.location.pathname },
    });
  };

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
            <Search className="top-autocomplete" showDeleted={showDeleted} />
            <ReactPaginate
              pageCount={Math.ceil(
                sourcePathList?.pagination?.total_pages || 1
              )}
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
              value={page.limit}
              className="ms-2"
              onChange={(e) => {
                updatePage(1, +e.target.value);
              }}
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
          <div
            style={{ position: "absolute", right: "10px" }}
            className="form-check"
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Show deleted"
          >
            <input
              className="form-check-input"
              type="checkbox"
              value={showDeleted}
              onChange={(e) => {
                setShowDeleted(!showDeleted);
              }}
            />
          </div>
        </div>
        <div className="card" style={{ border: "none" }}>
          {sourcePathList ? (
            <div style={{ overflowX: "auto" }}>
              <table className="" style={{ padding: "20px", minWidth: "100%" }}>
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th
                      className="text-truncate"
                      style={{ width: "20%", padding: "10px" }}
                    >
                      Path
                    </th>
                    <th className="text-truncate">Created By</th>
                    <th className="text-truncate">Created At</th>
                    <th className="text-truncate">Updated By</th>
                    <th className="text-truncate">Updated At</th>
                    <th
                      className="text-truncate"
                      style={{ width: "15%", padding: "10px" }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sourcePathList?.paths?.map((key, index) => (
                    <tr
                      key={key.file_uid}
                      className={
                        key.bookmark_id !== null ? "bookmarkedrow" : ""
                      }
                    >
                      <td className="text-truncate" style={{ padding: "10px" }}>
                        {key.path}
                      </td>
                      <td className="text-truncate">{key.created_by}</td>
                      <td className="text-truncate">
                        {new Date(key.created_at).toLocaleString()}
                      </td>
                      <td className="text-truncate">{key.updated_by}</td>
                      <td className="text-truncate">
                        {new Date(key.updated_at).toLocaleString()}
                      </td>
                      <td className="text-truncate" style={{ padding: "10px" }}>
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
                                  language: broadcastLangCode,
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
                                  language: broadcastLangCode,
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
                                    language: broadcastLangCode,
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
                          onClick={() => handleEditSlide(key)}
                        />
                        <span
                          className="position-relative cursor-pointer"
                          data-bs-toggle="tooltip"
                          data-bs-placement="right"
                          title={key.hidden ? "Undelete" : "Delete"}
                          onClick={() => {
                            setUnbookmarkAction(false);
                            setDeleteConfirmationPopup(true);
                            setDeleteId(key.ID);
                            setDeleteIdHidden(key.hidden);
                            setSourceUidForDeleteSlide(key.source_uid);
                          }}
                        >
                          <i className="bi bi-trash3"></i>
                          {key.hidden && (
                            <i className="bi bi-x-circle-fill text-danger position-absolute top-0 start-100 translate-middle fs-6"></i>
                          )}
                        </span>
                        {key.hidden && (
                          <i
                            className="bi bi-trash3-fill text-danger"
                            style={{ marginLeft: "30px" }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="right"
                            title="Delete forever"
                            onClick={() => {
                              setUnbookmarkAction(false);
                              setDeleteConfirmationPopup(true);
                              setDeleteId(key.ID);
                              setDeleteIdForever(key.hidden);
                              setSourceUidForDeleteSlide(key.source_uid);
                            }}
                          ></i>
                        )}
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
