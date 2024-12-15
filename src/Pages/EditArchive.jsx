import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addNewSlide,
  deleteNewSlide,
  updateNewSlide,
  updateSourcePath,
  GetAllArchiveData,
} from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import { Slide } from "../Components/Slide";
import { SplitToSlides } from "../Utils/SlideSplit";
import Button from "@mui/material/Button";

const EditArchive = ({ handleClose }) => {
  const navigate = useNavigate();
  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );
  const dispatch = useDispatch();
  const [isLtr, setIsLtr] = useState(true);
  const [slideListData, setSlideListData] = useState([]);
  const [selected, setSelected] = useState(0);
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

  // Retrieve the slide_id from the URL parameters
  const searchParams = new URLSearchParams(location.search);
  const slideID = searchParams.get("slide_id");
  useEffect(() => {
    dispatch(
      GetAllArchiveData({
        file_uid: localStorage.getItem("file_uid_for_edit_slide"),
        language: broadcastLangObj.label,
        limit: 2000,
      })
    ).then((response) => {
      if (
        response.payload.data?.slides &&
        response.payload.data?.slides.length > 0
      ) {
        setSlideListData(response.payload.data.slides);
        setIsLtr(response.payload.data.slides[0].left_to_right);
        setSourcePath(response.payload.data.slides[0].source_path);
        setSourcePathId(response.payload.data.slides[0].source_path_id);
      }
    });
  }, []);

  useEffect(() => {
    const performUpdates = async () => {
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

    performUpdates();
  }, [updatedSlideTextList]);

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

  const handleSave = () => {
    const shouldDelete = deleted?.length > 0;
    const shouldForceDelete = shouldDelete && force_delete_bookmarks;

    handleUpdateSourcePath();

    if (shouldDelete) {
      const deleteParams = {
        force_delete_bookmarks: shouldForceDelete,
        slide_ids: deleted,
      };
      dispatch(
        deleteNewSlide({
          data: deleteParams,
          language: broadcastLangObj.label,
        })
      );

      handleUpdateSourcePath();
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
          language: broadcastLangObj.label,
        })
      );
    }

    if (updateSlideList?.length > 0) {
      const updateSlideListRequest = {
        updateSlideList: updateSlideList,
        file_uid: slideListData[0]?.file_uid,
      };
      dispatch(updateNewSlide(updateSlideListRequest));
    }
    setIsLtr(isLtr);
    setDeleted([]);
  };

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
          handleClose();
        }}
      />
    ),
    [confirmation]
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
    [forceDeleteConfirm]
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
  };

  const handleUpdateSourcePath = () => {
    if (!isNaN(sourcePathId) && sourcePathId > 0 && sourcePath) {
      if (
        sourcePath &&
        sourcePath.trim() !== slideListData[0]?.source_path?.trim()
      ) {
        dispatch(
          updateSourcePath({
            sourcePathId: sourcePathId,
            sourcePath: sourcePath,
          })
        );
      }
    }
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

  const handleBack = () => {
    const previousLocation = location.state?.previousLocation || "/archive";
    navigate(previousLocation);
  };

  return (
    <>
      {ForceDeleteBookmark}
      {ConfirmationMessage}
      <div className="archiveBackground bg-light Edit">
        <div className="card border-0">
          <div className="top-row d-flex sticky-holder">
            <h4 className="m-0 inline-flex me-4">Edit Subtitle</h4>
            <div className="inline-flex">
              <input
                type="text"
                className={`update-source-path-inp form-control input  ${
                  isLtr ? "ChangeToLtr" : "ChangeToRtl"
                }`}
                value={sourcePath}
                onChange={handleSourcePathChange}
                placeholder="Update Source Path"
              />
            </div>
            <div className="me-4">
              <button
                className="btn btn-success inline-flex update-source-path-btn"
                onClick={handleUpdateSourcePath}
              >
                Update Source Path
              </button>
            </div>
            <div className="inline-flex">
              <button
                type="button"
                onClick={() => rerun()}
                className="btn cancel"
              >
                Re-run
              </button>
              <button
                type="button"
                onClick={() => setIsLtr(!isLtr)}
                className="btn cancel"
              >
                {isLtr ? "LTR" : "RTL"}
              </button>
              <button
                onClick={() => {
                  const addNewSlides = slideListData
                    ?.filter((key) => key?.addedNew === true)
                    ?.map(({ file_uid, slide, order_number }) => ({
                      file_uid,
                      slide,
                      order_number,
                    }));
                  const updateNewSlides = slideListData
                    ?.filter((key) => key?.updateSlide === true)
                    ?.map(({ ID, slide, order_number }) => ({
                      slide_id: ID,
                      slide,
                      order_number,
                    }));
                  if (
                    deleted?.length > 0 ||
                    addNewSlides?.length > 0 ||
                    updateNewSlides?.length > 0
                  ) {
                    setConfirmation(true);
                  } else {
                    handleClose();
                  }
                }}
                type="button"
                className="btn cancel"
              >
                Cancel
              </button>
              <button onClick={handleSave} type="button" className="btn save ">
                Save
              </button>

              <Button
                variant="outlined"
                color="primary"
                onClick={handleBack}
                className=".btn btn-back "
              >
                Back
              </Button>
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
                      value={key?.slide}
                      onKeyDown={(e) => {
                        const textArea = e.target;
                        let textAreaParent = textArea.parentElement;
                        if (
                          e.keyCode === 8 &&
                          textArea.selectionStart === 0 &&
                          textArea.selectionEnd === 0 &&
                          index > 0
                        ) {
                          // Move first line to previous text-area
                          while (
                            !!textAreaParent &&
                            !textAreaParent.className.includes("row")
                          ) {
                            textAreaParent = textAreaParent.parentElement;
                          }
                          if (
                            textAreaParent &&
                            textAreaParent.previousElementSibling
                          ) {
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
                                    lines[0] +
                                    " ",
                                };
                                cloneSlideDataArray[index] = {
                                  ...key,
                                  slide: key.slide.slice(offset + 1),
                                };

                                setSlideListData(cloneSlideDataArray);
                              }
                              setSelected(index - 1);
                              prevTextArea.focus();
                              prevTextArea.selectionStart =
                                prevTextArea.value.length;
                            }
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

                        if (key.addedNew) {
                          cloneSlideDataArray.splice(index, 1);
                          cloneSlideDataArray.splice(index, 0, {
                            ...key,
                            slide: newValue,
                          });
                          setSlideListData(cloneSlideDataArray);
                        } else {
                          cloneSlideDataArray.splice(index, 1);
                          cloneSlideDataArray.splice(index, 0, {
                            ...key,
                            slide: newValue,
                            updateSlide: true,
                          });
                          setSlideListData(cloneSlideDataArray);
                        }
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
                          const cloneSlidedataArray = [...slideListData];
                          cloneSlidedataArray[index] = {
                            ...cloneSlidedataArray[index],
                          };
                          cloneSlidedataArray[index].left_to_right =
                            key.left_to_right === false ? true : false;
                          setSlideListData(cloneSlidedataArray);
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
                          const cloneSlidedataArray = [...slideListData];
                          cloneSlidedataArray[index] = {
                            ...cloneSlidedataArray[index],
                          };
                          cloneSlidedataArray[index].slide_type =
                            key.slide_type === "question"
                              ? "subtitle"
                              : "question";
                          setSlideListData(cloneSlidedataArray);
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
                          const cloneSlidedataArray = [...slideListData];
                          let numberOfPreviousSlides = 0;
                          for (let i = 0; i < cloneSlidedataArray.length; i++) {
                            if (key?.ID === cloneSlidedataArray[i].ID) {
                              numberOfPreviousSlides = i + 1;
                              break;
                            }
                          }
                          cloneSlidedataArray.splice(index + 1, 0, {
                            // slide_id: +key?.ID + 1,
                            file_uid: key?.file_uid,
                            slide: "",
                            addedNew: true,
                            slide_type: "subtitle",
                          });
                          const updatedSlideListData = cloneSlidedataArray.map(
                            (slide, i) => {
                              const updatedOrderNumber = Math.floor(
                                i / key.languages.length
                              );
                              return {
                                ...slide, // Spread the original slide object to create a new one
                                order_number: updatedOrderNumber, // Update the order_number property
                                languages: key.languages,
                              };
                            }
                          );
                          setSlideListData(updatedSlideListData);
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
              setSplit(false);
              setUpdatedSlideTextList(slides);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default EditArchive;
