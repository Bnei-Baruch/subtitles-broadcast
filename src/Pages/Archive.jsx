import React, { useContext, useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import {
  BookmarkSlideFromArchivePage,
  DeleteArchive,
  GetAllArchiveData,
  SlideListWithFildeUid,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import { getAllArchiveList } from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import DeleteConfirmation from "../Components/DeleteConfirmation";
import EditArcive from "./EditArchive";
import ReactPaginate from "react-paginate";
import { Slide } from "../Components/Slide";
import { useLocation } from "react-router-dom";
import GetLangaugeCode from "../Utils/Const";
import AppContext from "../AppContext";

const Archive = () => {
  const appContextlData = useContext(AppContext);
  const queryParams = new URLSearchParams(useLocation().search);
  const dispatch = useDispatch();
  const ArchiveList = useSelector(getAllArchiveList);
  const languages = GetLangaugeCode();

  // const [delete,setDelete]=useState('')
  const [page, setPage] = useState({
    page: 1,
    limit: 10,
  });
  const [pageIndex, setPageIndex] = useState({ startIndex: 1, endIndex: 10 });
  const localPagination = localStorage?.getItem("pagination")
    ? JSON?.parse(localStorage?.getItem("pagination"))
    : page;

  const message = "";
  const [editSlide, setEditSlide] = useState("");
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
    setPage(localPagination);
    const limit = +localPagination?.limit || 10;
    const page = +localPagination?.page || 1;
    const totalRows = +ArchiveList?.pagination?.total_rows || 0;

    setPageIndex({
      startIndex: (page - 1) * limit + 1,
      endIndex: +page * +limit < +totalRows ? page * limit : totalRows,
    });

    // const startIndex = (page.page - 1) * page.limit + 1;
    // const endIndex = Math.min(
    //   page.page * page.limit,
    //   ArchiveList?.pagination?.total_rows
    // );
  }, [localPagination.page, localPagination.limit, ArchiveList]);

  useEffect(() => {
    dispatch(
      GetAllArchiveData({
        language: languages[appContextlData.broadcastLang.label],
        page: page.page,
        limit: page.limit,
      })
    );
  }, [page.page, page.limit, appContextlData.broadcastLang.label]);

  useEffect(() => {
    if (finalConfirm === true) {
      dispatch(
        DeleteArchive({
          slide_ids: [deleteId],
        })
      );
      setFinalConfirm(false);
    }
    if (toggle) {
      dispatch(BookmarkSlideFromArchivePage(deleteId));
      setToggle(false);
    }
  }, [finalConfirm, toggle, deleteId, dispatch]);

  useEffect(() => {
    if (fileUidForEditSlide !== null) {
      dispatch(
        SlideListWithFildeUid({
          file_uid: fileUidForEditSlide,
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
    () => (
      <MessageBox
        setFinalConfirm={() => {
          dispatch(
            BookmarkSlideFromArchivePage({
              ...bookmarkData,
              params: { page: page.page, limit: page.limit },
            })
          );
        }}
        message={"Are you sure , you want to bookmark this File slide"}
        show={confirmation}
        handleClose={() => setConfirmation(false)}
      />
    ),
    [confirmation, message]
  );

  return (
    <>
      {DelectConfirmationModal}
      {ConfirmationMessage}
      {editSlide ? (
        <EditArcive handleClose={() => setEditSlide(false)} />
      ) : (
        <div className="archiveBackground  bg-light Edit">
          <div className="card" style={{ border: "none" }}>
            {ArchiveList ? (
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
                    {ArchiveList?.slides?.map((key) => (
                      <tr
                        key={key.ID}
                        className={
                          key.bookmark_id !== null ? "bookmarkedrow" : ""
                        }
                      >
                        <td style={{ padding: "10px" }}>
                          <div className="" style={{ outline: "solid" }}>
                            <Slide content={key.slide} isLtr={true} />
                          </div>
                        </td>
                        <td
                          style={{ padding: "10px" }}
                          className="text-truncate"
                        >
                          {key.slide_source_path}
                        </td>
                        <td style={{ padding: "10px" }}>
                          {key.bookmark_id !== null ? (
                            <i
                              onClick={() => {
                                setConfirmation(true);
                                setBookmarkData({
                                  file_uid: key?.file_uid,
                                  slide_id: key?.ID,
                                  update: true,
                                });
                              }}
                              className="bi bi-bookmark-check-fill m-2 cursor-pointer "
                            />
                          ) : (
                            <i
                              onClick={() => {
                                dispatch(
                                  BookmarkSlideFromArchivePage({
                                    file_uid: key?.file_uid,
                                    slide_id: key?.ID,
                                    update: false,
                                    order: ArchiveList?.slides?.find(
                                      (k) => k.bookmark_id !== null
                                    )?.length,
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
                              dispatch(
                                SlideListWithFildeUid({
                                  file_uid: key?.file_uid,
                                })
                              );
                              setEditSlide(key.ID);
                            }}
                          />
                          <i
                            onClick={() => {
                              setDeleteConfirmationPopup(true);
                              setDeleteId(key.ID);
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
                localStorage.setItem(
                  "pagination",
                  JSON.stringify({ page: page.page, limit: e.target.value })
                );
                setPage({ page: 1, limit: e.target.value });
              }}
            >
              <span>Row per page:</span>
              <select
                value={localPagination?.limit || page.limit}
                className="ms-2"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>{" "}
              &nbsp; &nbsp; &nbsp;
              <span>{`${pageIndex.startIndex}-${pageIndex.endIndex} of ${ArchiveList?.pagination?.total_rows} `}</span>
            </div>

            <div className="flex-box-center">
              {/* Content for the second flex box centered */}
              <ReactPaginate
                pageCount={ArchiveList?.pagination?.total_pages}
                onPageChange={(e) => {
                  const selectedPage = e.selected + 1;
                  if (selectedPage <= ArchiveList?.pagination?.total_pages) {
                    setPage({ ...page, page: selectedPage });
                    localStorage.setItem(
                      "pagination",
                      JSON.stringify({ page: selectedPage, limit: page.limit })
                    );
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
                        page.page === ArchiveList?.pagination?.total_pages
                          ? "not-allowed"
                          : "pointer",
                      color:
                        page.page === ArchiveList?.pagination?.total_pages
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
