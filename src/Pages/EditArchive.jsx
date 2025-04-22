import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addNewSlide,
  deleteNewSlide,
  updateNewSlide,
  updateSourcePath,
  GetAllArchiveData,
  BookmarkSlideFromArchivePage,
  UnBookmarkSlide,
} from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import { Slide } from "../Components/Slide";
import { SplitToSlides } from "../Utils/SlideSplit";
import Button from "@mui/material/Button";
import LoadingOverlay from "../Components/LoadingOverlay";
import { updateSettingsInternal } from "../Redux/UserSettings/UserSettingsSlice";

const findRow = (textArea) => {
  while (!!textArea && !textArea.className.includes("row")) {
    textArea = textArea.parentElement;
  }
  return textArea;
};

const handleDeleteSlide = (
  key,
  index,
  slideListData,
  setSlideListData,
  deleted,
  setDeleted,
  setForceDeleteConfirm
) => {
  if (key.bookmark_id !== null && key?.ID) {
    setForceDeleteConfirm(index);
  } else {
    const cloneSlidedataArray = [...slideListData];
    cloneSlidedataArray.splice(index, 1);
    const updatedSlides = cloneSlidedataArray.map((slide, idx) => ({
      ...slide,
      order_number: idx,
    }));
    setSlideListData(updatedSlides);
    if (key?.ID) {
      setDeleted([...deleted, key?.ID]);
    }
  }
};

const performSplit = async (slideListData, setSlideListData, updatedSlideTextList, deleted, setDeleted) => {
  // Create a mutable copy of the array and its objects
  const newSlideListData = [...slideListData];
  const offsetSlide = Math.max(
    0,
    Math.min(
      parseInt(localStorage.getItem("myIndex"), 10),
      newSlideListData.length - 1
    )
  );
  let i = 0;

  // Keep existing slides that did not change intact.
  for (; i < updatedSlideTextList.length; i++) {
    if (
      newSlideListData[i + offsetSlide].slide !== updatedSlideTextList[i]
    ) {
      break;
    }
  }

  // Update existing slides with new content, from i to the last.
  for (
    let j = i;
    j + offsetSlide < newSlideListData.length &&
    j < updatedSlideTextList.length;
    j++
  ) {
    newSlideListData[j + offsetSlide] = {
      ...newSlideListData[j + offsetSlide],
      slide: updatedSlideTextList[j],
    };
  }

  // Add new slided at the end.
  for (
    let j = newSlideListData.length - offsetSlide;
    j < updatedSlideTextList.length;
    j++
  ) {
    const slideData = {
      file_uid: newSlideListData[0].file_uid,
      slide: updatedSlideTextList[j],
      order_number: newSlideListData.length,
      left_to_right: newSlideListData[0].left_to_right,
    };
    newSlideListData.push(slideData);
  }
  if (newSlideListData.length - offsetSlide > updatedSlideTextList.length) {
    // Delete
    let deleteSlideIds = [];
    for (
      let j = offsetSlide + updatedSlideTextList.length;
      j < newSlideListData.length;
      j++
    ) {
      deleteSlideIds.push(newSlideListData[j].ID);
    }
    setDeleted([...deleted, ...deleteSlideIds]);
    newSlideListData.splice(
      offsetSlide + updatedSlideTextList.length,
      newSlideListData.length - offsetSlide - updatedSlideTextList.length
    );
  }
  setSlideListData(newSlideListData);
};


const EditArchive = ({ handleClose }) => {
  const [loading, setLoading] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const navigate = useNavigate();
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );
  const dispatch = useDispatch();
  const [isLtr, setIsLtr] = useState(true);
  const [slideListData, setSlideListData] = useState([]);
  const [selected, setSelected] = useState(0);
  const [selectedStart, setSelectedStart] = useState(-1);
  const [confirmation, setConfirmation] = useState(false);
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState(null);
  const [force_delete_bookmarks, setForce_delete_bookmarks] = useState(false);
  const [deleted, setDeleted] = useState([]);
  const [wholeText, setWholeText] = useState("");
  const [split, setSplit] = useState(false);
  const [updatedSlideTextList, setUpdatedSlideTextList] = useState([]);
  const [sourcePath, setSourcePath] = useState(null);
  const [sourcePathId, setSourcePathId] = useState(null);
  const location = useLocation();
  const hasSelected = useRef(false); // Ref to track if navigation selection by slide id has already been made
  const [isSlideDataChanged, setIsSlideDataChanged] = useState(false);
  const [initialSlideData, setInitialSlideData] = useState([]); // Original slide data for comparison

  // Retrieve the slide_id from the URL parameters
  const searchParams = new URLSearchParams(location.search);
  const slideID = searchParams.get("slide_id");

  const userSettingsPagination = useSelector(
    (state) => state.userSettings.userSettings.archive_pagination
  );
  const page = useMemo(
    () => userSettingsPagination || { page: 1, limit: 10 },
    [userSettingsPagination]
  );

  const [isBookmarked, setIsBookmarked] = useState(false);
  const userSettings = useSelector((state) => state.userSettings.userSettings);
  const file_uid_for_edit_slide = userSettings?.file_uid_for_edit_slide || null;
  const bookmar_id_for_edit = userSettings?.bookmar_id_for_edit || null;
  const slide_id_for_edit = userSettings?.slide_id_for_edit || null;

  const fetchArchiveSlides = useCallback(async () => {
    if (!file_uid_for_edit_slide) {
      // Don't fetch any slides if file uid not selected.
      return;
    }

    // Retrieve the slides data from the server
    setLoading(true);

    dispatch(
      GetAllArchiveData({
        file_uid: file_uid_for_edit_slide,
        language: broadcastLangCode,
        limit: 2000,
      })
    )
      .then((response) => {
        if (
          response.payload.data?.slides &&
          response.payload.data?.slides.length > 0
        ) {
          const slides = response.payload.data.slides || [];
          setSlideListData(slides);
          setInitialSlideData(slides);
          setIsLtr(slides[0].left_to_right);
          setSourcePath(slides[0].source_path);
          setSourcePathId(slides[0].source_path_id);

          const isBookmarked = slides.some(
            (slide) => slide.bookmark_id !== null
          );
          setIsBookmarked(isBookmarked);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, file_uid_for_edit_slide, broadcastLangCode]);

  // Load data when the component mounts
  useEffect(() => {
    fetchArchiveSlides();
  }, [fetchArchiveSlides]);

  // Focus and set cursor for textarea.
  useEffect(() => {
    if (selectedStart >= 0) {
      const textAreas = document.querySelectorAll('textarea');
      if (textAreas && textAreas.length > selected) {
        const textArea = textAreas[selected];
        textArea.focus();
        textArea.selectionStart = selectedStart;
        textArea.selectionEnd = selectedStart;
        if (textArea.selectionStart === 0) {
          textArea.scrollTop = 0;
        } else if (textArea.value.length === textArea.selectionStart) {
          textArea.scrollTop = textArea.scrollHeight;
        }
      }
      setSelectedStart(-1);
    }
  }, [selected, selectedStart]);

  // Monitor changes to slideListData and compare with initialSlideData
  useEffect(() => {
    if (Array.isArray(slideListData) && Array.isArray(initialSlideData)) {
      if (slideListData.length > 0 && initialSlideData.length > 0) {
        const isChanged = isDataChanged(initialSlideData, slideListData);
        setIsSlideDataChanged(isChanged);
      }
    }
  }, [slideListData, initialSlideData]);

  const isDataChanged = (data1, data2) => {
    let isChanged = false;

    if (data1.length !== data2.length) {
      isChanged = true;
    } else {
      for (let i = 0; i < data1.length; i++) {
        const item1 = data1[i];
        const item2 = data2[i];

        if (
          item1.order_number !== item2.order_number ||
          item1.slide_type !== item2.slide_type ||
          item1.left_to_right !== item2.left_to_right ||
          item1.slide.length !== item2.slide.length ||
          item1.slide !== item2.slide
        ) {
          isChanged = true;
          break;
        }
      }
    }

    return isChanged;
  };

  useEffect(() => {
    // Performs split only when re-run clicked.
    if (split && !!updatedSlideTextList.length) {
      performSplit(slideListData, setSlideListData, updatedSlideTextList, deleted, setDeleted);
      setSplit(false);
      setUpdatedSlideTextList([]);
    }
  }, [split, slideListData, setSlideListData, updatedSlideTextList, setUpdatedSlideTextList, deleted, setDeleted]);

  useEffect(() => {
    if (!hasSelected.current && slideID && slideListData.length > 0) {
      const slideElement = document.querySelector(
        `[data-slide-id="${slideID}"]`
      );

      if (slideElement) {
        slideElement.click();
        slideElement.scrollIntoView({ behavior: "smooth", block: "center" });
        hasSelected.current = true;
      }
    }
  }, [slideListData, slideID, setSelected]);

  const isSourceParthChanged = useCallback(() => {
    let isChanged = false;

    if (!isNaN(sourcePathId) && sourcePathId > 0) {
      if (
        sourcePath &&
        sourcePath.trim() !== slideListData[0]?.source_path?.trim()
      ) {
        isChanged = true;
      }
    }

    return isChanged;
  }, [slideListData, sourcePath, sourcePathId]);

  const handleUpdateSourcePath = useCallback((flow) => {
    if (isSourceParthChanged()) {
      dispatch(
        updateSourcePath({
          sourcePathId: sourcePathId,
          sourcePath: sourcePath,
        })
      ).then((response) => {
        if (flow !== "save" && response.payload && response.payload.success) {
          fetchArchiveSlides();
        }
      });
    }
  }, [dispatch, fetchArchiveSlides, isSourceParthChanged, sourcePath, sourcePathId]);

  const handleSave = useCallback(async () => {
    if (!isSlideDataChanged) {
      return;
    }

    const shouldDelete = deleted?.length > 0;
    const shouldForceDelete = shouldDelete && force_delete_bookmarks;

    handleUpdateSourcePath("save");

    if (shouldDelete) {
      const deleteParams = {
        force_delete_bookmarks: shouldForceDelete,
        slide_ids: deleted,
      };
      dispatch(
        deleteNewSlide({
          data: deleteParams,
          language: broadcastLangCode,
        })
      );
    }

    const updateSlideList = slideListData
      ?.filter(({ ID }) => ID !== undefined)
      ?.map(
        ({ ID, slide, order_number, slide_type, left_to_right }, index) => ({
          slide_id: ID,
          slide,
          left_to_right: left_to_right === false ? false : true,
          order_number: order_number,
          slide_type,
        })
      );

    const addNewSlideList = slideListData
      ?.filter(({ ID }) => ID === undefined)
      ?.map(({ slide, order_number, slide_type }) => ({
        slide,
        order_number,
        left_to_right:
          slideListData[0] && slideListData[0].left_to_right === false
            ? false
            : true,
        file_uid: slideListData[0]?.file_uid,
        slide_type,
      }));

    if (addNewSlideList?.length > 0) {
      dispatch(
        addNewSlide({
          list: addNewSlideList,
          language: broadcastLangCode,
        })
      );
    }

    if (updateSlideList?.length > 0) {
      const updateSlideListRequest = {
        updateSlideList: updateSlideList,
        file_uid: slideListData[0]?.file_uid,
      };
      setLoading(true);
      dispatch(updateNewSlide(updateSlideListRequest)).finally((response) => {
        setLoading(false);
      });
    }
    setIsLtr(isLtr);
    setDeleted([]);
    setIsSlideDataChanged(false);
    setInitialSlideData(slideListData);
  }, [broadcastLangCode, deleted, dispatch, force_delete_bookmarks, handleUpdateSourcePath, isLtr, isSlideDataChanged, slideListData]);

  const handleBack = () => {
    const previousLocation = location.state?.previousLocation || "/archive";
    navigate(previousLocation);
  };

  const fallbackHandleClose = () => {
    handleBack();
  };

  const effectiveHandleClose = handleClose || fallbackHandleClose;

  const ConfirmationMessage = useMemo(
    () => (
      <MessageBox
        setFinalConfirm={() => {
          handleSave();
        }}
        buttonName={["Drop changes", "Save changes"]}
        message={"You will not able to recover changes"}
        show={confirmation}
        handleClose={() => {
          setConfirmation(false);
          effectiveHandleClose();
        }}
      />
    ),
    [confirmation, effectiveHandleClose, handleSave]
  );

  const ForceDeleteBookmark = useMemo(
    () => (
      <MessageBox
        setFinalConfirm={() => {
          const findIDFORDelete = slideListData[forceDeleteConfirm]?.ID;
          const cloneSlidedataArray = [...slideListData];
          cloneSlidedataArray?.splice(forceDeleteConfirm, 1);
          setSlideListData(cloneSlidedataArray);
          setForce_delete_bookmarks(true);
          setDeleted([...deleted, findIDFORDelete]);
        }}
        buttonName={["No", "Yes"]}
        message={"You want to delete bookmarked slide "}
        show={forceDeleteConfirm != null}
        handleClose={() => {
          setForceDeleteConfirm(null);
        }}
      />
    ),
    [deleted, slideListData, forceDeleteConfirm]
  );

  const rerun = () => {
    let index = parseInt(localStorage.getItem("myIndex"), 10);

    const parts = [];
    for (let i = index; i < slideListData.length; i++) {
      parts.push(slideListData[i].slide);
    }
    setWholeText(parts.join("\r"));
    setSplit(true);
  };

  const handleSourcePathChange = (e) => {
    setSourcePath(e.target.value);

    // Check if the new value matches the initial value
    const initialSourcePath = slideListData[0]?.source_path || "";
    if (e.target.value.trim() === initialSourcePath.trim()) {
      setIsSlideDataChanged(false); // No changes detected
    } else {
      setIsSlideDataChanged(true); // Changes detected
    }
  };

  const handleBackBtn = (evt) => {
    if (isSlideDataChanged) {
      setConfirmation(true);
    } else {
      effectiveHandleClose();
    }
  };

  // Will replace the first updatedSlide at index and will add/update more
  // slides depending on updateSlide or addedNew field.
  const spliceSlideList = (index, updatedSlides) => {
    if (updatedSlides.length === 0) {
      return;
    }
    const languages = updatedSlides[0].languages;
    const cloneSlidedataArray = [...slideListData];
    let deleteItems = 1;
    let consecutiveUpdates = true;
    const cloneUpdatedSlides = updatedSlides.map((slide, i) => {
      if (i === 0) {
        return {
          ...slide,
          updateSlide: true,
        };
      } else {
        if (consecutiveUpdates && slide.updateSlide) {
          deleteItems++;
          return {
            ...slide,
            updateSlide: true,
          };
        } else {
          consecutiveUpdates = false;
          return {
            ...slide,
            addedNew: true,
          };
        }
      }
    });

    cloneSlidedataArray.splice(index, deleteItems, ...cloneUpdatedSlides);
    // cloneSlidedataArray.splice(index, 1, {
    //   ...slide,
    //   updateSlide: true,
    // }, {
    //   file_uid: slide?.file_uid,
    //   slide: newSlide,
    //   addedNew: true,
    //   slide_type: "subtitle",
    //   left_to_right: slide.left_to_right,
    // });
    const updatedSlideListData = cloneSlidedataArray.map((slide, i) => {
      const updatedOrderNumber = Math.floor(i / languages.length);
      return {
        ...slide, // Spread the original slide object to create a new one
        order_number: updatedOrderNumber, // Update the order_number property
        languages,
      };
    });
    setSlideListData(updatedSlideListData);
  };

  const handleCancelBtn = (evt) => {
    if (isSlideDataChanged) {
      setShowCancelConfirmation(true);
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirmation(false);
    fetchArchiveSlides();
  };

  const cancelCancel = () => {
    setShowCancelConfirmation(false);
  };

  const toggleSlideDirection = (index, key) => {
    const cloneSlidedataArray = [...slideListData];
    cloneSlidedataArray[index] = {
      ...cloneSlidedataArray[index],
    };
    cloneSlidedataArray[index].left_to_right =
      key.left_to_right === false ? true : false;
    setSlideListData(cloneSlidedataArray);
  };

  function toggleSlideType(slideListData, index, key, setSlideListData) {
    const cloneSlidedataArray = [...slideListData];
    cloneSlidedataArray[index] = {
      ...cloneSlidedataArray[index],
    };
    cloneSlidedataArray[index].slide_type =
      key.slide_type === "question" ? "subtitle" : "question";
    setSlideListData(cloneSlidedataArray);
  }

  const handleSaveAndBack = async () => {
    await handleSave();
    handleBack();
  };

  const handleToggleBookmark = () => {
    if (!slideListData[0]?.file_uid) return;

    if (isBookmarked) {
      if (!bookmar_id_for_edit) return;

      setLoading(true);

      dispatch(
        UnBookmarkSlide({
          search_keyword: localStorage.getItem("free-text"),
          bookmark_id: bookmar_id_for_edit,
          language: broadcastLangCode,
          page: page.page,
          limit: page.limit,
        })
      )
        .then((response) => {
          if (response?.payload?.success) {
            setIsBookmarked(false);
          }
        })
        .finally(() => {
          dispatch(
            updateSettingsInternal({
              bookmar_id_for_edit: null,
            })
          );
          setLoading(false);
        });
    } else {
      if (!file_uid_for_edit_slide) return;

      const defSlideId = slide_id_for_edit || slideListData[0]?.ID;

      dispatch(
        updateSettingsInternal({
          slide_id_for_edit: defSlideId,
        })
      );

      dispatch(
        BookmarkSlideFromArchivePage({
          search_keyword: localStorage.getItem("free-text"),
          data: {
            file_uid: file_uid_for_edit_slide,
            slide_id: defSlideId,
            update: false,
          },
          language: broadcastLangCode,
          params: page,
        })
      )
        .then((response) => {
          if (response.payload.success) {
            dispatch(
              updateSettingsInternal({
                bookmar_id_for_edit: response.payload.data.ID,
              })
            );
            setIsBookmarked(true);
          } else {
            BookmarkSlideFromArchivePage({
              search_keyword: localStorage.getItem("free-text"),
              data: {
                file_uid: file_uid_for_edit_slide,
                slide_id: defSlideId,
                update: true,
              },
              language: broadcastLangCode,
              params: page,
            }).then((response) => {
              if (response.payload.success) {
                dispatch(
                  updateSettingsInternal({
                    bookmar_id_for_edit: response.payload.data.ID,
                  })
                );
                setIsBookmarked(true);
              }
            });
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  return (
    <>
      <LoadingOverlay loading={loading} />
      {showCancelConfirmation && (
        <MessageBox
          message="Are you sure you want to cancel changes?"
          buttonName={["No", "Yes"]}
          setFinalConfirm={confirmCancel}
          handleClose={cancelCancel}
          show={showCancelConfirmation}
        />
      )}
      {ForceDeleteBookmark}
      {ConfirmationMessage}
      <div className="archiveBackground bg-light Edit">
        <div className="card border-0">
          <div className="top-row d-flex sticky-holder">
            <div className="responsive-container">
              <h4 className="m-2">Edit Subtitle</h4>
              <div>
                <input
                  type="text"
                  className={`update-source-path-inp form-control input  ${
                    isLtr ? "ChangeToLtr" : "ChangeToRtl"
                  }`}
                  value={sourcePath || ""} // Provide a fallback value
                  onChange={handleSourcePathChange}
                  placeholder="Update Source Path"
                />
              </div>
              <div className="button-container">
                <Button
                  variant="contained"
                  onClick={handleToggleBookmark}
                  color="success"
                  className={`btn  bookmark-btn  ${isBookmarked ? "btn-secondary" : "btn-info"}`}
                >
                  {isBookmarked ? "Unbookmark" : "Bookmark"}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => rerun()}
                  className="btn btn-re-run"
                >
                  Re-run
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleBackBtn}
                  className=".btn btn-back"
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleCancelBtn}
                  className={`btn btn-cancel  ${isSlideDataChanged ? "subtitle-changed" : "cancel action-notallowed"}`}
                >
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  className={`"btn save  ${isSlideDataChanged ? "subtitle-changed" : "cancel action-notallowed"}`}
                  onClick={handleSave}
                >
                  Save
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSaveAndBack}
                  className={`btn save ${isSlideDataChanged ? "subtitle-changed" : "cancel action-notallowed"}`}
                >
                  Save & Back
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          {slideListData?.length > 0 &&
            slideListData?.map((key, index) => (
              <div
                className="row "
                key={`row_slide_${key.order_number}`}
                id={`row_slide_${key.order_number}`}
              >
                <div
                  className={`col-md-6 mb-2`}
                  onClick={() => {
                    dispatch(
                      updateSettingsInternal({
                        slide_id_for_edit: key.ID,
                      })
                    );
                    setSelected(index);
                    localStorage.setItem("myIndex", index);
                  }}
                  data-slide-id={key.ID}
                >
                  <div
                    className={`adjustable-font box box2 ${
                      index === selected && "EditActiveSlide"
                    }`}
                  >
                    <textarea
                      value={key?.slide || ""} // Provide a fallback value
                      onKeyDown={(e) => {
                        const textArea = e.target;
                        let textAreaParent = findRow(textArea);
                        if (
                          e.key === "ArrowUp" &&
                          textArea.selectionStart === textArea.selectionEnd &&
                          textArea.selectionStart === 0 &&
                          !!textAreaParent.previousElementSibling
                        ) {
                          const prevTextArea =
                            textAreaParent.previousElementSibling.querySelector(
                              "textarea"
                            );
                          if (prevTextArea) {
                            setSelected(index - 1);
                            setSelectedStart(prevTextArea.value.length);
                            e.preventDefault();
                          }
                        } else if (
                          e.key === "ArrowDown" &&
                          textArea.selectionStart === textArea.selectionEnd &&
                          textArea.selectionStart === textArea.value.length &&
                          !!textAreaParent.nextElementSibling 
                        ) {
                          const nextTextArea = (textAreaParent.nextElementSibling &&
                            textAreaParent.nextElementSibling.querySelector(
                              "textarea"
                            )) || null;
                          if (nextTextArea) {
                            setSelected(index + 1);
                            setSelectedStart(0);
                            e.preventDefault();
                          }
                        } else if (
                          e.key === "Enter" && e.ctrlKey &&
                          textArea.selectionStart === textArea.selectionEnd
                        ) {
                          // Ctrl+Enter - Move the rest of the text to next text-area.
                          const nextTextArea = (textAreaParent.nextElementSibling &&
                            textAreaParent.nextElementSibling.querySelector(
                              "textarea"
                            )) || null;
                          let updatedSlideText = key.slide.slice(0, textArea.selectionStart);
                          if (updatedSlideText.endsWith('\n') || updatedSlideText.endsWith('\r')) {
                            updatedSlideText = updatedSlideText.slice(0, -1);
                          }
                          const nextSlideText = key.slide.slice(textArea.selectionStart);
                          const updatedSlides = [{
                            ...key,
                            slide: updatedSlideText,
                            updateSlide: true,
                          }];
                          if (!nextTextArea) {
                            updatedSlides.push({
                              file_uid: key.file_uid,
                              slide: nextSlideText,
                              addedNew: true,
                              slide_type: key.slide_type,
                              left_to_right: key.left_to_right,
                            });
                          } else {
                            const newLine = slideListData[index+1].slide && nextSlideText ? '\n' : '';
                            updatedSlides.push({
                              ...slideListData[index+1],
                              slide: nextSlideText + newLine + slideListData[index+1].slide,
                              updateSlide: true,
                            });
                          }
                          spliceSlideList(index, updatedSlides);
                          setSelected(index + 1);
                          setSelectedStart(0);
                          e.preventDefault();
                        } else if (
                          e.keyCode === 8 &&
                          textArea.selectionStart === 0 &&
                          textArea.selectionEnd === 0 &&
                          index > 0 &&
                          !!textAreaParent && !!textAreaParent.previousElementSibling
                        ) {
                          // Backspace - Move first line to previous text-area.
                          const prevTextArea =
                            textAreaParent.previousElementSibling.querySelector(
                              "textarea"
                            );
                          if (prevTextArea) {
                            const cloneSlideDataArray = [...slideListData];
                            const prevKey = slideListData[index - 1];
                            let lines = key.slide.split(/[\r\n]/);
                            let offset = 0;
                            if (lines.length > 0) {
                              offset = lines[0].length;
                              cloneSlideDataArray[index - 1] = {
                                ...prevKey,
                                slide:
                                  cloneSlideDataArray[index - 1].slide +
                                  "\n" +
                                  lines[0]
                              };
                              cloneSlideDataArray[index] = {
                                ...key,
                                slide: key.slide.slice(offset + 1),
                              };

                              setSlideListData(cloneSlideDataArray);
                            }
                            setSelected(index - 1);
                            setSelectedStart(prevTextArea.value.length + 1);
                            e.preventDefault();
                          }
                        }
                      }}
                      onChange={(e) => {
                        let newValue = e.target.value;

                        // Perform any special handling for \r if needed
                        if (newValue.includes("\n")) {
                          newValue = newValue.replace(/\n/g, "\r");
                        }

                        const cloneSlideDataArray = [...slideListData];
                        cloneSlideDataArray.splice(index, 1);
                        cloneSlideDataArray.splice(index, 0, {
                          ...key,
                          slide: newValue,
                          updateSlide: !key.addedNew ? true : undefined,
                        });
                        setSlideListData(cloneSlideDataArray);
                      }}
                      key={index}
                      className=""
                      style={{
                        direction: key.left_to_right === false ? "rtl" : "ltr",
                      }}
                    />

                    {index === selected && (
                      <i
                        onClick={() =>
                          handleDeleteSlide(
                            key,
                            index,
                            slideListData,
                            setSlideListData,
                            deleted,
                            setDeleted,
                            setForceDeleteConfirm
                          )
                        }
                        className="bi bi-trash3 delete-icon "
                        style={{
                          [key.left_to_right === false ? "left" : "right"]:
                            "5px",
                        }}
                      />
                    )}

                    {index === selected && (
                      <i
                        onClick={() => {
                          return toggleSlideDirection(index, key);
                        }}
                        className={
                          (key.left_to_right === false
                            ? "bi-arrow-bar-left"
                            : "bi-arrow-bar-right") + " bi delete-icon"
                        }
                        title={
                          key.left_to_right === false
                            ? "The slide is Right To Left. Change it to the Left To Right press the iccon"
                            : "The slide is Left To Right. Change it to the Right To Left press the iccon"
                        }
                        style={{
                          color: "black",
                          [key.left_to_right === false ? "left" : "right"]:
                            "80px",
                        }}
                      />
                    )}

                    {index === selected && (
                      <i
                        onClick={() => {
                          return toggleSlideType(
                            slideListData,
                            index,
                            key,
                            setSlideListData
                          );
                        }}
                        className={
                          (key.slide_type === "question"
                            ? "bi-question-circle"
                            : "bi-card-text") + " bi delete-icon"
                        }
                        style={{
                          color: "black",
                          [key.left_to_right === false ? "left" : "right"]:
                            "56px",
                        }}
                      />
                    )}
                    {index === selected && (
                      <i
                        onClick={() => rerun()}
                        className="bi bi-bootstrap-reboot delete-icon "
                        style={{
                          color: "black",
                          [key.left_to_right === false ? "left" : "right"]:
                            "30px",
                        }}
                      />
                    )}
                    {index === selected && (
                      <i
                        onClick={() => {
                          const newEmptySlide = {
                            file_uid: key.file_uid,
                            slide: "",
                            addedNew: true,
                            slide_type: "subtitle",
                            left_to_right: key.left_to_right,
                          };
                          return spliceSlideList(index, [key, newEmptySlide]);
                        }}
                        className="bi bi-plus-circle add-icon "
                      />
                    )}
                  </div>
                </div>
                <div className="col-md-6 ">
                  <div
                    key={index}
                    className=" adjustable-font"
                    // style={containerStyle}
                  >
                    <Slide
                      content={key?.slide}
                      isLtr={key && key.left_to_right === false ? false : true}
                      isQuestion={key?.slide_type === "question"}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div>
          <SplitToSlides
            markdown={wholeText}
            visible={false}
            active={split}
            updateSlides={(slides) => {
              setUpdatedSlideTextList(slides);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default EditArchive;
