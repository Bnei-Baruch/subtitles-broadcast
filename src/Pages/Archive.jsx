import React, { useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import {
  BookmarkSlide,
  DeleteArchive,
  GetAllArchiveData,
  UnBookmarkSlide,
} from "../Redux/ArchiveTab/ArchiveSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllArchiveList,
  AddToSubtitleList,
} from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import DeleteConfirmation from "../Components/DeleteConfirmation";
import Select from "react-select";
import ReactPaginate from "react-paginate";
import { useNavigate } from "react-router-dom";
import Dropdown from "react-bootstrap/Dropdown";
import useDebounce from "../Services/useDebounce";
import EditArcive from "./EditArchive";

const Archive = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  var htmlRegexG = /<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g;
  const ArchiveList = useSelector(getAllArchiveList);
  // const [delete,setDelete]=useState('')
  const [page, setPage] = useState({
    page: 1,
    limit: 10,
  });
  const [editSlide, setEditSlide] = useState("");
  const [message, setMessage] = useState("");
  const [toggle, setToggle] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [deleteId, setDeleteId] = useState();
  const [deleteConfirmationPopup, setDeleteConfirmationPopup] = useState(false);
  // const [bookmarkId, setBookmarkId] = useState();
  const DebouncingFreeText = useDebounce(freeText, 3000);
  useEffect(() => {
    dispatch(GetAllArchiveData({ language: "en", ...page, keyword: freeText }));
  }, [page, DebouncingFreeText]);

  useEffect(() => {
    if (finalConfirm === true) {
      dispatch(DeleteArchive(deleteId));
      setFinalConfirm(false);
      // if (message?.split(" ")?.includes("delete")) {
      //   alert("delete");
      // }
    }
    if (toggle) {
      dispatch(BookmarkSlide(deleteId));
      setToggle(false);
    }
  }, [finalConfirm, toggle]);

  console.log(ArchiveList, "ArchiveList");
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
        setFinalConfirm={setToggle}
        message={message}
        show={confirmation}
        handleClose={() => setConfirmation(false)}
      />
    ),
    [confirmation]
  );
  console.log(ArchiveList, "<<<<<<<");
  return (
    <>
      {DelectConfirmationModal}
      {ConfirmationMessage}
      {editSlide ? (
        <EditArcive />
      ) : (
        <div className="archiveBackground  ">
          <div class="search-box">
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
                  options={ArchiveList?.archives?.map((key) => ({
                    value: key.author,
                    label: key.author,
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
                    {/* <th scope="col">Book</th>
                <th scope="col">Title</th> */}
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

                      {/* <td>{key.book}</td>
                  <td>{key.title}</td> */}
                      <td>
                        {
                          <i
                            onClick={() => {
                              const fileIds = Array.isArray(
                                JSON.parse(localStorage.getItem("fileids"))
                              )
                                ? JSON.parse(localStorage.getItem("fileids"))
                                : [];

                              const fileIdsArr = new Set([
                                ...fileIds,
                                key?.file_id,
                              ]);

                              localStorage.setItem(
                                "fileids",
                                JSON.stringify(Array.from(fileIdsArr))
                              );

                              navigate("/subtitle");
                            }}
                            className="bi bi-plus"
                          />
                        }
                        {key.bookmarked == true ? (
                          <i
                            onClick={() => {
                              dispatch(UnBookmarkSlide(key?.ID));
                              // setMessage(
                              //   "Are you sure , you want to bookmark this title"
                              // );
                              // setDeleteId(key.ID);
                              // setConfirmation(true);
                            }}
                            class="bi bi-bookmark-check-fill m-2"
                          />
                        ) : (
                          <i
                            onClick={() => {
                              dispatch(BookmarkSlide(key?.ID));
                              // setMessage(
                              //   "Are you sure , you want to unbookmark this title"
                              // );
                              // setDeleteId(key.ID);
                              // setConfirmation(true);
                            }}
                            class="bi bi-bookmark m-2"
                          />
                        )}

                        <Dropdown>
                          <Dropdown.Toggle
                            variant="Secondary"
                            id="dropdown-basic"
                          >
                            <i class="bi bi-three-dots-vertical"></i>
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item>
                              <i
                                class="bi bi-pencil"
                                onClick={() => setEditSlide(key.ID)}
                              />
                            </Dropdown.Item>
                            <Dropdown.Item>
                              <i
                                onClick={() => {
                                  setDeleteConfirmationPopup(true);
                                  setDeleteId(key.ID);
                                }}
                                class="bi bi-trash3 m-2"
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
              <div className="card d-flex h-50%">
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
              </select>
            </div>
            <div className="arrow">
              <button
                className={`bi bi-chevron-left me-1  ${
                  ArchiveList?.pagination?.page === 1 && "disablecolor"
                }`}
                disabled={page.page == 1}
                onClick={() => setPage({ ...page, page: page.page - 1 })}
              />
              <button
                className="bi bi-chevron-right ms-1"
                onClick={() => setPage({ ...page, page: page.page + 1 })}
              />
            </div>
            <div className="blank"></div>
            {/* 
<ReactPaginate
        breakLabel="..."
        nextLabel="next >"
        onPageChange={(e)=>setPage(e.selected)}
        pageRangeDisplayed={5}
        pageCount={ArchiveList?.pagination?.total_pages
        }
        previousLabel="< previous"
        renderOnZeroPageCount={null}
      /> */}
            {/* <div className="">
        <span>Rows per page:</span>
        <select>
            <option>10</option>
            <option>10</option>
            <option>10</option>
        </select>
    </div> */}
          </div>
        </div>
      )}
    </>
  );
};

export default Archive;
