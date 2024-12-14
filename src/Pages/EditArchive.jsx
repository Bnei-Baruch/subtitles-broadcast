import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
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

const EditArcive = ({ handleClose }) => {
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
  const [, setSlideTextList] = useState([]);
  const [wholeText, setWholeText] = useState("");
  const [split, setSplit] = useState(false);
  const [slideTextListCopy, setSlideTextListCopy] = useState([]);
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
        setSlideTextListCopy(response.payload.data.slides);
        setIsLtr(response.payload.data.slides[0].left_to_right);
        setSourcePath(response.payload.data.slides[0].source_path);
        setSourcePathId(response.payload.data.slides[0].source_path_id);
      }
    });
  }, []);

  useEffect(() => {
    const performUpdates = async () => {
      let i = 0;
      // Create a mutable copy of the array and its objects
      let mutableSlideTextListCopy = slideTextListCopy.map((item) => ({
        ...item,
      }));
      let currentSlide = parseInt(localStorage.getItem("myIndex"), 10);
      mutableSlideTextListCopy = mutableSlideTextListCopy.slice(currentSlide);
      for (; i < mutableSlideTextListCopy.length; i++) {
        if (mutableSlideTextListCopy[i].slide !== updatedSlideTextList[i]) {
          break;
        }
      }

      // Update
      let updateSlideList = [];
      if (i < mutableSlideTextListCopy.length) {
        // Update slides from i to the last
        for (let j = i; j < mutableSlideTextListCopy.length; j++) {
          const slideData = {
            slide_id: mutableSlideTextListCopy[j].ID,
            slide: updatedSlideTextList[j],
            order_number: mutableSlideTextListCopy[j].order_number,
            left_to_right: mutableSlideTextListCopy[j].left_to_right,
          };
          updateSlideList.push(slideData);
        }
        const updateSlideListRequest = {
          updateSlideList: updateSlideList,
          file_uid: mutableSlideTextListCopy[0].file_uid,
        };
        await dispatch(updateNewSlide(updateSlideListRequest));

        if (mutableSlideTextListCopy.length < updatedSlideTextList.length) {
          // Add
          let addNewSlideList = [];
          for (
            let j = mutableSlideTextListCopy.length;
            j < updatedSlideTextList.length;
            j++
          ) {
            const slideData = {
              file_uid: mutableSlideTextListCopy[0].file_uid,
              slide: updatedSlideTextList[j],
              order_number:
                mutableSlideTextListCopy[mutableSlideTextListCopy.length - 1]
                  .order_number +
                (j - mutableSlideTextListCopy.length + 1),
              left_to_right: mutableSlideTextListCopy[0].left_to_right,
            };
            addNewSlideList.push(slideData);
          }
          if (addNewSlideList.length > 0) {
            await dispatch(
              addNewSlide({
                list: addNewSlideList,
                language: broadcastLangObj.label,
              })
            );
          }
        } else {
          // Delete
          let deleteSlideIds = [];
          for (
            let j = updatedSlideTextList.length;
            j < mutableSlideTextListCopy.length;
            j++
          ) {
            deleteSlideIds.push(mutableSlideTextListCopy[j].ID);
          }
          if (deleteSlideIds.length > 0) {
            const deleteParams = {
              force_delete_bookmarks: true,
              slide_ids: deleteSlideIds,
            };
            await dispatch(
              deleteNewSlide({
                data: deleteParams,
                language: broadcastLangObj.label,
              })
            );
          }
        }
      }
      await dispatch(
        GetAllArchiveData({
          language: broadcastLangObj.label,
          limit: 2000,
          file_uid: localStorage.getItem("file_uid_for_edit_slide"),
        })
      ).then((response) => {
        if (
          response.payload.data?.slides &&
          response.payload.data?.slides.length > 0
        ) {
          setSlideListData(response.payload.data.slides);
          setSlideTextListCopy(response.payload.data.slides);
        }
      });
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

  const handleSubmit = () => {
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

    const updateSlideList = slideListData?.map(
      ({ ID, slide, order_number, slide_type, left_to_right }, index) => ({
        slide_id: ID,
        slide,
        left_to_right: left_to_right === false ? false : true,
        order_number: order_number,
        slide_type,
      })
    );

    const addNewSlideList = updateSlideList
      ?.filter(({ slide_id }) => slide_id === undefined)
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
    handleClose();
  };

  const ConfirmationMessage = useMemo(
    () => (
      <MessageBox
        setFinalConfirm={() => {
          handleSubmit();
        }}
        buttonName={["Delete", "Save"]}
        message={"You will not able to recover it"}
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
        buttonName={["On", "Yes"]}
        message={"You want to delete bookmarked slide "}
        show={forceDeleteConfirm != null}
        handleClose={() => {
          // deleted?.pop();
          // setDeleted(deleted);
          setForceDeleteConfirm(null);
        }}
      />
    ),
    [forceDeleteConfirm]
  );

  const parseFileContents = (fileContents) => {
    const wordsArray = fileContents.replace(/\r/g, " <br/> ").split(/\s+/);
    let structuredArray = [];
    let previousWord = "";
    wordsArray.forEach((word, index) => {
      const elementObject = {
        paragraphStart: previousWord === "<br/>" && word !== "<br/>",
        tagName: "",
        word: word,
      };
      structuredArray.push(elementObject);
      previousWord = word;
    });
    return structuredArray;
  };

  const rerun = () => {
    let index = parseInt(localStorage.getItem("myIndex"), 10);
    let updateSlideList = [];
    for (let i = 0; i < index; i++) {
      const slideData = {
        slide_id: slideListData[i].ID,
        slide: slideListData[i].slide,
        order_number: slideListData[i].order_number,
        left_to_right: slideListData[i].left_to_right,
      };
      updateSlideList.push(slideData);
    }
    const updateSlideListRequest = {
      updateSlideList: updateSlideList,
      file_uid: slideListData[0].file_uid,
    };
    dispatch(updateNewSlide(updateSlideListRequest));
    let newSlideTextList = [];
    const parts = [];
    for (let i = index; i < slideListData.length; i++) {
      let words = parseFileContents(slideListData[i].slide);
      parts.push(slideListData[i].slide);
      words[0].paragraphStart = true;
      for (let word of words) {
        newSlideTextList.push(word);
      }
    }
    setWholeText(parts.join("\r"));
    setSplit(true);
    setSlideTextList(newSlideTextList);
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

  return (
    <>
      {ForceDeleteBookmark}
      {ConfirmationMessage}
      <div className="archiveBackground bg-light Edit">
        <div className="card border-0">
          <div className="top-row d-flex">
            <h4 className="m-0 inline-flex me-4">Edit Subtitle</h4>
            <div className="inline-flex w-50">
              <input
                type="text"
                className={`form-control input  ${
                  isLtr ? "ChangeToLtr" : "ChangeToRtl"
                }`}
                value={sourcePath}
                onChange={handleSourcePathChange}
                placeholder="Update Source Path"
              />
            </div>
            <div className="me-4">
              <button
                className="btn btn-success inline-flex"
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
                    ?.filter((key) => key?.addedNew == true)
                    ?.map(({ file_uid, slide, order_number }) => ({
                      file_uid,
                      slide,
                      order_number,
                    }));
                  const updateNewSlides = slideListData
                    ?.filter((key) => key?.updateSlide == true)
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
              <button
                onClick={handleSubmit}
                type="button"
                className="btn save "
              >
                Save
              </button>
            </div>
          </div>
        </div>
        <div className="container">
          {slideListData?.length > 0 &&
            slideListData?.map((key, index) => (
              <div
                className="row "
                key={`row_slide_${key.ID}`}
                id={`row_slide_${key.ID}`}
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
                      index == selected && "EditActiveSlide"
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

                    {index == selected && (
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

                    {index == selected && (
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

                    {index == selected && (
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
                    {index == selected && (
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
                    {index == selected && (
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
                          let additionalOrderNumber = 0;
                          if (
                            numberOfPreviousSlides % key.languages.length ===
                            0
                          ) {
                            additionalOrderNumber += 1;
                          }
                          cloneSlidedataArray.splice(index + 1, 0, {
                            // slide_id: +key?.ID + 1,
                            file_uid: key?.file_uid,
                            slide: "",
                            //order_number: key?.order_number + additionalOrderNumber,
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

export default EditArcive;
