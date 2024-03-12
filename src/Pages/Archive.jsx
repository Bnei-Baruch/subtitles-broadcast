import React, { useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import {
  ArchiveAutoComplete,
  BookmarkSlideFromArchivePage,
  DeleteArchive,
  GetAllArchiveData,
  GetAllAuthorList,
  SlideListWithFildeUid,
  emptyAutoComplete,
  getAutocompleteSuggetion,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import { getAllArchiveList } from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import DeleteConfirmation from "../Components/DeleteConfirmation";
import Dropdown from "react-bootstrap/Dropdown";
import useDebounce from "../Services/useDebounce";
import EditArcive from "./EditArchive";
import { Search } from "react-bootstrap-icons";
import ReactPaginate from "react-paginate";

const Archive = () => {
  const dispatch = useDispatch();
  const ArchiveList = useSelector(getAllArchiveList);
  const ActocompleteList = useSelector(getAutocompleteSuggetion);

  // const [delete,setDelete]=useState('')
  const [page, setPage] = useState({
    page: 1,
    limit: 10,
  });
  const startIndex = (page.page - 1) * page.limit + 1;
  const endIndex = Math.min(
    page.page * page.limit,
    ArchiveList?.pagination?.total_rows
  );
  const message = "";
  const [editSlide, setEditSlide] = useState("");

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
  const localPagination = JSON.parse(localStorage.getItem("pagination"));

  useEffect(() => {
    if (localPagination) {
      setPage(localPagination);
    }
    dispatch(
      GetAllArchiveData({
        language: "en",
        page: page.page,
        limit: page.limit,
      })
    );
  }, [page.page, page.limit]);

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
          <div className="card">
            {ArchiveList ? (
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Text</th>
                    <th scope="col">Path</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ArchiveList?.slides?.map((key) => (
                    <tr
                      key={key.ID}
                      className={`${
                        key.bookmark_id !== null && "bookmarkedrow"
                      }`}
                    >
                      <th scope="row" className="textwidth">
                        <span className="truncate">{key.slide}</span>
                      </th>

                      {/* <td>{key.slide_source_path?.split("/")?.[0]}</td> */}
                      <td>{key.slide_source_path}</td>

                      <td>
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
                            className="bi bi-bookmark-check-fill m-2"
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
                                    (key) => key.bookmark_id !== null
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
                            className="bi bi-bookmark m-2"
                          />
                        )}

                        <Dropdown>
                          <Dropdown.Toggle
                            variant="Secondary"
                            id="dropdown-basic"
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item>
                              <i
                                className="bi bi-pencil"
                                onClick={() => {
                                  dispatch(
                                    SlideListWithFildeUid({
                                      file_uid: key?.file_uid,
                                    })
                                  );
                                  setEditSlide(key.ID);
                                }}
                              />
                            </Dropdown.Item>
                            <Dropdown.Item>
                              <i
                                onClick={() => {
                                  setDeleteConfirmationPopup(true);
                                  setDeleteId(key.ID);
                                }}
                                className="bi bi-trash3 "
                              />
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <span>{`${startIndex}-${endIndex} of ${ArchiveList?.pagination?.total_rows} `}</span>
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
