import React, { useEffect, useMemo, useState } from "react";
import "./PagesCSS/Archive.css";
import { GetAllArchiveData } from "../Redux/ArchiveTab/ArchiveSlice";
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
  const [message, setMessage] = useState("");
  const [toggle, setToggle] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [deleteConfirmationPopup, setDeleteConfirmationPopup] = useState(false);

  useEffect(() => {
    dispatch(GetAllArchiveData(page));
  }, [page]);

  useEffect(() => {
    if (finalConfirm === true) {
      if (message?.split(" ")?.includes("delete")) {
        alert("delete");
      }
    }
  }, [finalConfirm]);

  console.log(ArchiveList, "ArchiveList");
  const DelectConfirmationModal = useMemo(
    () => (
      <DeleteConfirmation
        confirm={setFinalConfirm}
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
  return (
    <>
      {DelectConfirmationModal}
      {ConfirmationMessage}
      <div className="archiveBackground vh-100 ">
        <div class="search-box">
          <div className="d-flex m-2">
            <div className="form-group col-3">
              <label>Free Text</label>
              <input type="text" className="form-control input " />
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
            <div className="form-group col-2">
              <label>Book</label>
              <Select
                options={ArchiveList?.archives?.map((key) => ({
                  value: key.book,
                  label: key.book,
                }))}
              />
            </div>
            <div className="form-group col-2">
              <label>Title</label>
              <Select
                options={ArchiveList?.archives?.map((key) => ({
                  value: key.title,
                  label: key.title,
                }))}
              />
            </div>
          </div>
        </div>
        <div className="card">
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
              {ArchiveList?.subtitles?.map((key) => (
                <tr key={key.id}>
                  <th scope="row" className="textwidth">
                    <span className="truncate">{key.subtitle}</span>
                  </th>
                  <td>{key.author}</td>

                  {/* <td>{key.book}</td>
                  <td>{key.title}</td> */}
                  <td>
                    {
                      <i
                        onClick={() => {
                          dispatch(AddToSubtitleList({ id: key?.id }));
                          navigate("/subtitle");
                        }}
                        className="bi bi-plus"
                      />
                    }
                    {key.bookmark == true ? (
                      <i
                        onClick={() => {
                          setMessage(
                            "Are you sure , you want to bookmark this title"
                          );
                          setConfirmation(true);
                        }}
                        class="bi bi-bookmark-check-fill m-2"
                      />
                    ) : (
                      <i
                        onClick={() => {
                          setMessage(
                            "Are you sure , you want to bookmark this title"
                          );
                          setConfirmation(true);
                        }}
                        class="bi bi-bookmark m-2"
                      />
                    )}
                    <i
                      onClick={() => {
                        setDeleteConfirmationPopup(true);
                      }}
                      class="bi bi-trash3 m-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="m-3 ">
          <div
            className=""
            onChange={(e) => setPage({ page: 1, limit: e.target.value })}
          >
            <span>Row per page:</span>
            <select>
              <option>10</option>
              <option>20</option>
              <option>30</option>
            </select>
          </div>
          <i
            className={`bi bi-chevron-left  ${
              ArchiveList?.pagination?.page === 1 && "disablecolor"
            }`}
            onClick={() => setPage({ ...page, page: page - 1 })}
          />
          <i
            className="bi bi-chevron-right"
            onClick={() => setPage({ ...page, page: page + 2 })}
          />
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
    </>
  );
};

export default Archive;
