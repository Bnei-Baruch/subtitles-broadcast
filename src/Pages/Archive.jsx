import React, { useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import {
  ArchiveAutoComplete,
  BookmarkSlide,
  DeleteArchive,
  GetAllArchiveData,
  GetAllAuthorList,
  SlideListWithFildeUid,
  UnBookmarkSlide,
  emptyAutoComplete,
  getAllAuthorList,
  getAutocompleteSuggetion,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import { getAllArchiveList } from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import DeleteConfirmation from "../Components/DeleteConfirmation";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import Dropdown from "react-bootstrap/Dropdown";
import useDebounce from "../Services/useDebounce";
import EditArcive from "./EditArchive";
import { Search } from "react-bootstrap-icons";
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";
import ReactPaginate from "react-paginate";

const Archive = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const ArchiveList = useSelector(getAllArchiveList);
  const AuthorList = useSelector(getAllAuthorList);
  const ActocompleteList = useSelector(getAutocompleteSuggetion);

  console.log(ActocompleteList, "ActocompleteList");

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
  const [freeText, setFreeText] = useState("");
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState();
  const [deleteConfirmationPopup, setDeleteConfirmationPopup] = useState(false);
  const [autoComplete, setAutoComplete] = useState(true);
  const [showAutocompleteBox, setShowAutocompleteBox] = useState();
  const [bookmarkData, setBookmarkData] = useState({
    file_uid: "",
    slide_id: "",
    update: "",
    order: "",
  });
  // const [bookmarkId, setBookmarkId] = useState();
  const DebouncingFreeText = useDebounce(freeText, 500);

  useEffect(() => {
    dispatch(GetAllAuthorList());
  }, [dispatch]);
  useEffect(() => {
    dispatch(
      GetAllArchiveData({
        language: "en",
        ...page,
        page: page.page,
        keyword: freeText,
      })
    );
  }, [page, DebouncingFreeText, dispatch, editSlide]);

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
      dispatch(BookmarkSlide(deleteId));
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
            BookmarkSlide({
              ...bookmarkData,
              params: { page: 1, limit: page.limit },
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

  useEffect(() => {
    // Dispatch the fetchAutoComplete action when the component mounts or when needed
    freeText !== "" &&
      autoComplete &&
      dispatch(ArchiveAutoComplete({ query: freeText }));
  }, [dispatch, freeText]);

  const handleSuggestionClick = (suggestion) => {
    setFreeText(suggestion);
    setAutoComplete(false);

    // Clear the suggestions when a suggestion is selected
    dispatch(emptyAutoComplete());
  };
  return (
    <>
      {DelectConfirmationModal}
      {ConfirmationMessage}
      {editSlide ? (
        <EditArcive handleClose={() => setEditSlide(false)} />
      ) : (
        <div className="archiveBackground  bg-light Edit">
          <div className="search-box">
            <div className="d-flex m-2">
              <div className="form-group col-3 autoComplete">
                <label>Free Text</label>

                <input
                  onBlur={() => setShowAutocompleteBox(false)}
                  value={freeText}
                  onKeyDown={(e) => {
                    e.key === "Enter" &&
                      dispatch(
                        GetAllArchiveData({
                          language: "en",
                          ...page,
                          page: 1,
                          keyword: freeText,
                        })
                      );
                  }}
                  onChange={(e) => {
                    setFreeText(e.target.value);
                  }}
                  type="text"
                  className="form-control input"
                />
                {showAutocompleteBox && (
                  <ul class="suggestions" id="suggestions">
                    {ActocompleteList?.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.source_value}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => {
                  dispatch(
                    GetAllArchiveData({
                      language: "en",
                      ...page,
                      page: 1,
                      keyword: freeText,
                    })
                  );
                }}
                className="search-button btn btn-primary"
              >
                <Search size={20} />
              </button>
            </div>
          </div>

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
                    <tr key={key.ID}>
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
                                order: key?.order_number,
                              });

                              // dispatch(UnBookmarkSlide(key?.ID));
                              //Below code will use in future

                              // setDeleteId(key.ID);
                              // setConfirmation(true);
                            }}
                            className="bi bi-bookmark-check-fill m-2"
                          />
                        ) : (
                          <i
                            onClick={() => {
                              dispatch(
                                BookmarkSlide({
                                  file_uid: key?.file_uid,
                                  slide_id: key?.ID,
                                  update: false,
                                  order: ArchiveList?.slides?.find(
                                    (key) => key.bookmark_id !== null
                                  )?.length,
                                  params: { page: 1, limit: page.limit },
                                })
                              )
                                .then((res) => {
                                  if (
                                    res.payload ===
                                    "The bookmark with the same file exists"
                                  ) {
                                    setBookmarkData({
                                      file_uid: key?.file_uid,
                                      slide_id: key?.ID,
                                      update: true,
                                      order:
                                        ArchiveList?.slides?.find(
                                          (key) => key.bookmark_id !== null
                                        )?.length || 1,
                                    });
                                    setConfirmation(true);
                                  }
                                })
                                .catch((err) => console.log(err, "LLLLLLL"));
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
              onChange={(e) => setPage({ page: 1, limit: e.target.value })}
            >
              <span>Row per page:</span>
              <select className="ms-2">
                <option>10</option>
                <option>20</option>
                <option>30</option>
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
