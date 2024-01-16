import React, { useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import {
  BookmarkSlide,
  DeleteArchive,
  GetAllArchiveData,
  GetAllAuthorList,
  UnBookmarkSlide,
  getAllAuthorList,
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
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";

const Archive = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const ArchiveList = useSelector(getAllArchiveList);
  const AuthorList = useSelector(getAllAuthorList);

  // const [delete,setDelete]=useState('')
  const [page, setPage] = useState({
    page: 1,
    limit: 10,
  });
  const message = "";
  const [editSlide, setEditSlide] = useState("");
  // const [message, setMessage] = useState("");
  const [toggle, setToggle] = useState(false);
  const [freeText, setFreeText] = useState("");
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
  const DebouncingFreeText = useDebounce(freeText, 3000);
  useEffect(() => {
    dispatch(GetAllAuthorList());
  }, [dispatch]);
  useEffect(() => {
    dispatch(GetAllArchiveData({ language: "en", ...page, keyword: freeText }));
  }, [page, DebouncingFreeText, dispatch]);

  useEffect(() => {
    if (finalConfirm === true) {
      dispatch(DeleteArchive(deleteId));
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
  return (
    <>
      {DelectConfirmationModal}
      {ConfirmationMessage}
      {editSlide ? (
        <EditArcive />
      ) : (
        <div className="archiveBackground  ">
          <div className="search-box">
            <div className="d-flex m-2">
              <div className="form-group col-3">
                <label>Free Text</label>
                <input
                  onChange={(e) => {
                    setFreeText(e.target.value);
                  }}
                  type="text"
                  className="form-control input "
                />
              </div>

              <div className="form-group col-2">
                <label>Author</label>

                <Select
                  options={AuthorList?.map((key) => ({
                    value: key,
                    label: key,
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="card">
            {ArchiveList ? (
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Text</th>
                    <th scope="col">Author</th>
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

                      <td>{key.slide_source_path?.split("/")?.[0]}</td>
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
                                  order: key?.order_number,
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
                                      order: key?.order_number,
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
                                onClick={() => setEditSlide(key.ID)}
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

          <div className="m-3 d-flex justify-content-between">
            <div
              className=""
              onChange={(e) => setPage({ page: 1, limit: e.target.value })}
            >
              <span>Row per page:</span>
              <select className="ms-2">
                <option>10</option>
                <option>20</option>
                <option>30</option>
              </select>{" "}
              &nbsp; &nbsp; &nbsp;
              <span>
                {ArchiveList?.pagination?.page *
                  ArchiveList?.pagination?.limit -
                  9}
                -
                {ArchiveList?.pagination?.page * ArchiveList?.pagination?.limit}{" "}
                of {ArchiveList?.pagination?.total_rows}
              </span>
            </div>
            <div className="arrow">
              <i
                className={`bi bi-chevron-left me-1  ${
                  ArchiveList?.pagination?.page === 1
                    ? "disablecolor"
                    : "custom-pagination"
                }`}
                onClick={() => {
                  page.page !== 1 && setPage({ ...page, page: page.page - 1 });
                }}
              />
              <i
                className={`bi bi-chevron-right ms-1  ${
                  ArchiveList?.pagination?.page *
                    ArchiveList?.pagination?.limit >
                  ArchiveList?.pagination?.total_rows
                    ? "disablecolor"
                    : "custom-pagination"
                }`}
                onClick={() => {
                  ArchiveList?.pagination?.page *
                    ArchiveList?.pagination?.limit <
                    ArchiveList?.pagination?.total_rows &&
                    setPage({ ...page, page: page.page + 1 });
                }}
              />
            </div>
            <div className="blank"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default Archive;
