import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./PagesCSS/Archive.css";
import { GetSources, DeleteSource } from "../Redux/SourceSlice";
import { UnBookmarkSlide, UpdateBookmarks, GetBookmarks } from "../Redux/BookmarksSlice";
// import MessageBox from "../Components/MessageBox";
// import { useLocation } from "react-router-dom";
import { Search } from "../Layout/Search";
import { TableVirtuoso } from 'react-virtuoso';
import { Edit } from "../Components/Edit";

const formatDateTimeLocal = (date) => {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const Source = () => {
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");

  const {
    broadcast_language_code: language,
    broadcast_program_code: channel,
  } = useSelector((state) => state.userSettings.userSettings);

  // const queryParams = new URLSearchParams(useLocation().search);
  const { sources } = useSelector((state) => state.sources);
	const { bookmarks } = useSelector((state) => state.bookmarks);

  const [{editSlideId, editFileUid}, setEdit] = useState({ editSlideId: null, editFileUid: null });
  const [showDeleted, setShowDeleted] = useState(false);

  // const [unbookmarkAction, setUnbookmarkAction] = useState(false);

  // const message = "";
  /*const [SourceUidForDeleteSlide, setSourceUidForDeleteSlide] = useState(
    queryParams.get("source_uid")
  );*/
  // const [pathForDelete, setPathForDelete] = useState("default");

  // const [toggle, setToggle] = useState(false);
  // const [finalConfirm, setFinalConfirm] = useState(false);
  // const [confirmation, setConfirmation] = useState(false);
  /*const [deleteId, setDeleteId] = useState();
  const [deleteIdHidden, setDeleteIdHidden] = useState(false);
  const [deleteIdForever, setDeleteIdForever] = useState(false);
  const [deleteConfirmationPopup, setDeleteConfirmationPopup] = useState(false);
  const [bookmarkData, setBookmarkData] = useState({
    file_uid: "",
    update: "",
  });*/

  const refetchSources = useCallback(() => {
    // Update number of bookmarks.
    dispatch(GetBookmarks({ language, channel }));
    // Update sources.
    return dispatch(GetSources({
      language,
      keyword: search,
      hidden: showDeleted ? "true" : undefined,
    }));
  }, [search, language, showDeleted]);

  useEffect(() => {
    refetchSources();
  }, [refetchSources]);

  /*
  useEffect(() => {
    if (finalConfirm === true) {
      dispatch(DeleteSource({
        source_uid: SourceUidForDeleteSlide,
        debug_path: pathForDelete,
        hidden: deleteIdHidden ? "true" : undefined,
        forever: deleteIdForever ? "true" : undefined,
      }));
      setFinalConfirm(false);
      setDeleteIdHidden(false);
      setDeleteIdForever(false);
    }
    if (toggle) {
      dispatch(
        BookmarkSlideFromArchivePage({
          search_keyword: search,
          data: deleteId,
          language,
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
  */

  /*const DelectConfirmationModal = useMemo(
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
  );*/

  /*const ConfirmationMessage = useMemo(() => {
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
  */

  const handleEditSlide = (slide) => {
    setEdit({ editSlideId: slide.slide_id, editFileUid: slide.file_uid });
  };

  return (
    <>
      {editSlideId &&
        <Edit fileUid={editFileUid}
              slideId={editSlideId}
              handleClose={() => {
                refetchSources().finally(() => {
                  setEdit({editSlideId: null, editFileUid: null});
                });
              }} />}
      {!editSlideId && 
      <div
        className="archiveBackground bg-light Edit"
        style={{ position: "relative" }}
      >
        <div className="flex-container">
          <div className="top-autocomplete">
            <Search search={search} searchChanged={setSearch} />
            <div
              className="form-check"
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              title="Show deleted"
            >
              <input
                className="form-check-input"
                type="checkbox"
                value={showDeleted}
                onChange={(e) => setShowDeleted(!showDeleted)}
              />
              <span>{sources.length}</span>
            </div>
          </div>
        </div>
        <div className="card sources-container" style={{ border: "none" }}>
          <TableVirtuoso
            data={sources}
            fixedHeaderContent={() => (
              <tr>
                <th className="text-truncate" style={{ width: "20%", padding: "10px" }}>
                  Path
                </th>
                <th className="text-truncate">#</th>
                <th className="text-truncate">Created By</th>
                <th className="text-truncate">Created At</th>
                <th className="text-truncate">Updated By</th>
                <th className="text-truncate">Updated At</th>
                <th className="text-truncate" style={{ width: "15%", padding: "10px" }}>
                  Action
                </th>
              </tr>
            )}
            itemContent={(index, source) => (
              <>
                <td className={`text-truncate ${source.bookmark_id !== null ? "bookmarked-cell" : ""}`} style={{ padding: "10px" }}>
                  {source.path}
                </td>
                <td className={`text-truncate ${source.bookmark_id !== null ? "bookmarked-cell" : ""}`} style={{ padding: "10px" }}>
                  {source.slides_count}
                </td>
                <td className={`text-truncate ${source.bookmark_id !== null ? "bookmarked-cell" : ""}`}>{source.created_by}</td>
                <td className={`text-truncate ${source.bookmark_id !== null ? "bookmarked-cell" : ""}`}>
                  {formatDateTimeLocal(new Date(source.created_at))}
                </td>
                <td className={`text-truncate ${source.bookmark_id !== null ? "bookmarked-cell" : ""}`}>{source.updated_by}</td>
                <td className={`text-truncate ${source.bookmark_id !== null ? "bookmarked-cell" : ""}`}>
                  {formatDateTimeLocal(new Date(source.updated_at))}
                </td>
                <td className={`text-truncate ${source.bookmark_id !== null ? "bookmarked-cell" : ""}`} style={{ padding: "10px" }}>
                  {source.bookmark_id !== null ? (
                    <i
                      onClick={() => {
                        dispatch(UnBookmarkSlide({ 
                          bookmark_id: source.bookmark_id,
                        })).finally(() => {
                          refetchSources();
                        });
                      }}
                      className="bi bi-bookmark-check-fill m-2 cursor-pointer "
                    />
                  ) : (
                    <i
                      onClick={() => {
                        dispatch(UpdateBookmarks({
                          bookmarks: [{
                            file_uid: source.file_uid,
                            slide_id: source.slide_id,
                            order_number: bookmarks.length,
                          }],
                          update: false,
                        })).finally(() => {
                          refetchSources();
                        });
                      }}
                      className="bi bi-bookmark m-2 cursor-pointer "
                    />
                  )}
                  <i
                    className="bi bi-pencil m-2 cursor-pointer "
                    onClick={() => handleEditSlide(source)}
                  />
                  <span
                    className="position-relative cursor-pointer"
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    title={source.hidden ? "Undelete" : "Delete"}
                    onClick={() => {
                      console.log('Undelete/Delete not implemented', source.hidden);
                      if (source.hidden) {
                        dispatch(DeleteSource({
                          hidden: true,  // Undelete
                          source_uid: source.source_uid,
                          path: source.path,
                          language,
                        })).finally(() => {
                          refetchSources();
                        });
                      } else {
                        if (source.bookmark_id) {
                          if (window.confirm(`This source has bookmark, are you sure you want to delete the bookmark and the source: ${source.path}`)) {
                            dispatch(UnBookmarkSlide({ 
                              bookmark_id: source.bookmark_id,
                            })).then(() => {
                              dispatch(DeleteSource({
                                source_uid: source.source_uid,
                                path: source.path,
                                language,
                              })).finally(() => {
                                refetchSources();
                              });
                            });
                          }
                        } else if (window.confirm(`Are you sure you want to delete: ${source.path}`)) {
                          dispatch(DeleteSource({
                            source_uid: source.source_uid,
                            path: source.path,
                            language,
                          })).finally(() => {
                            refetchSources();
                          });
                        }
                      }
                    }}
                  >
                    <i className="bi bi-trash3"></i>
                    {source.hidden && (
                      <i className="bi bi-x-circle-fill text-danger position-absolute top-0 start-100 translate-middle fs-6"></i>
                    )}
                  </span>
                  {source.hidden && (
                    <i
                      className="bi bi-trash3-fill text-danger"
                      style={{ marginLeft: "30px" }}
                      data-bs-toggle="tooltip"
                      data-bs-placement="right"
                      title="Delete forever"
                      onClick={() => {
                        console.log('Delete forever');
                        if (window.confirm(`Are you sure you want to FOREVER delete: ${source.path}`)) {
                          dispatch(DeleteSource({
                            forever: true,
                            source_uid: source.source_uid,
                            path: source.path,
                            language,
                          })).finally(() => {
                            refetchSources();
                          });
                        }
                      }}
                    ></i>
                  )}
                </td>
              </>
            )}
          />
        </div>
      </div>
      }
    </>
  );
};

export default Source;
