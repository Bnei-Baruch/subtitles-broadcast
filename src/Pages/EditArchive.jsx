import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addNewSlide,
  deleteNewSlide,
  updateNewSlide,
} from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import { Slide } from "../Components/Slide";
import AppContext from "../AppContext";
import SlideSplit from "../Utils/SlideSplit";
import {
  GetAllArchiveData,
} from "../Redux/ArchiveTab/ArchiveSlice";

const EditArcive = ({ handleClose }) => {
  const appContextlData = useContext(AppContext);
  const dispatch = useDispatch();
  //const slideList = useSelector(getEditSlideList);
  const [isLtr, setIsLtr] = useState(true);
  //const [slideListData, setSlideListData] = useState(slideList?.slides);
  const [slideListData, setSlideListData] = useState([]);
  const [selected, setSelected] = useState(0);
  const [confirmation, setConfirmation] = useState(false);
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState(null);
  const [force_delete_bookmarks, setForce_delete_bookmarks] = useState(false);
  const [deleted, setDeleted] = useState([]);
  const [slideTextList, setSlideTextList] = useState([]);
  const [slideTextListCopy, setSlideTextListCopy] = useState([]);
  const [updatedSlideTextList, setUpdatedSlideTextList] = useState([]);
  const [reRun, setReRun] = useState(false);

  useEffect(() => {
    dispatch(
      GetAllArchiveData({
        language: appContextlData.broadcastLang.label,
      })
    ).then((response) => {
      if (response.payload.data?.slides && response.payload.data?.slides.length > 0) {
        setSlideListData(response.payload.data.slides);
        setSlideTextListCopy(response.payload.data.slides)
      }
    });
  }, []);

  useEffect(() => {
    console.log(slideListData)
  }, [slideListData]);

  // useEffect(() => {
  //   setIsLtr(slideList?.slides[0].left_to_right);
  //   setSlideListData(slideList?.slides);
  // }, [slideList?.slides]);

  useEffect(() => {
    setReRun(false);
    if (reRun === false) {
      // console.log(slideTextListCopy)
      // console.log(updatedSlideTextList)

      let i = 0;
      // Create a mutable copy of the array and its objects
      let mutableSlideTextListCopy = slideTextListCopy.map(item => ({ ...item }));
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
            left_to_right: mutableSlideTextListCopy[j].left_to_right
          };
          updateSlideList.push(slideData);
        }
        const updateSlideListRequest = {
          updateSlideList: updateSlideList,
          file_uid: mutableSlideTextListCopy[0].file_uid,
        };
        dispatch(updateNewSlide(updateSlideListRequest));

        if (mutableSlideTextListCopy.length < updatedSlideTextList.length) {
          // Add
          let addNewSlideList = [];
          for (let j = mutableSlideTextListCopy.length; j < updatedSlideTextList.length; j++) {
            const slideData = {
              file_uid: mutableSlideTextListCopy[0].file_uid,
              slide: updatedSlideTextList[j],
              order_number: mutableSlideTextListCopy[mutableSlideTextListCopy.length - 1].order_number + (j - mutableSlideTextListCopy.length + 1),
              left_to_right: mutableSlideTextListCopy[0].left_to_right
            }
            addNewSlideList.push(slideData)
          }
          if (addNewSlideList.length > 0) {
            dispatch(addNewSlide({
              list: addNewSlideList,
              language: appContextlData.broadcastLang.label
            }));
          }
        } else {
          // Delete
          let deleteSlideIds = [];
          for (let j = updatedSlideTextList.length; j < mutableSlideTextListCopy.length; j++) {
            deleteSlideIds.push(mutableSlideTextListCopy[j].ID);
          }
          if (deleteSlideIds.length > 0) {
            const deleteParams = {
              force_delete_bookmarks: true,
              slide_ids: deleteSlideIds
            }
            dispatch(deleteNewSlide({
              data: deleteParams,
              language: appContextlData.broadcastLang.label
            }));
          }
        }
      }
    }
    // let slideListToUpdate = [];
    // let newArray = [...updatedSlideTextList];
    // for (let i = 0; i < slideTextListCopy.length; i++) {
    //   for (let j = 0; j < newArray.length; j++) {
    //     if (slideTextListCopy[i].slide === newArray[j]) {
    //       newArray = newArray.slice(0, j).concat(newArray.slice(j + 1));
    //       j -= 1;
    //     } else if (longestCommonSubstring(slideTextListCopy[i].slide, newArray[j]) > 0) {
    //       slideListToUpdate.push(newArray[j]);
    //       newArray = newArray.slice(0, j).concat(newArray.slice(j + 1));
    //       j -= 1;
    //     }
    //   }
    // }
    // let slideListToDelete = newArray;


    // console.log(slideListToUpdate)
    // console.log(slideListToDelete)

    //  else {
    //   setSlideTextList(updatedSlideTextList);
    //   setUpdatedSlideTextList([]);
    // }

  }, [reRun]);

  const handleSubmit = () => {
    const shouldDelete = deleted?.length > 0;
    const shouldForceDelete = shouldDelete && force_delete_bookmarks;

    if (shouldDelete) {
      const deleteParams = {
        force_delete_bookmarks: shouldForceDelete,
        slide_ids: deleted,
      };
      dispatch(deleteNewSlide({
        data: deleteParams,
        language: appContextlData.broadcastLang.label
      }));
    }

    const updateSlideList = slideListData?.map(
      ({ ID, slide, order_number }, index) => ({
        slide_id: ID,
        slide,
        left_to_right: isLtr,
        order_number: order_number,
      })
    );

    const addNewSlideList = updateSlideList
      ?.filter(({ slide_id }) => slide_id === undefined)
      ?.map(({ slide, order_number }) => ({
        slide,
        order_number,
        left_to_right: isLtr,
        file_uid: slideListData[0]?.file_uid,
      }));

    if (addNewSlideList?.length > 0) {
      dispatch(addNewSlide({
        list: addNewSlideList,
        language: appContextlData.broadcastLang.label
      }));
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

  // const longestCommonSubstring = (str1, str2) => {
  //   let maxSubStr = '';
  //   let table = Array(str1.length).fill(null).map(() => Array(str2.length).fill(0));
  //   let longestLength = 0;
  //   let longestEndPos = 0;

  //   for (let i = 0; i < str1.length; i++) {
  //     for (let j = 0; j < str2.length; j++) {
  //       if (str1[i] === str2[j]) {
  //         if (i === 0 || j === 0) {
  //           table[i][j] = 1;
  //         } else {
  //           table[i][j] = table[i - 1][j - 1] + 1;
  //         }

  //         if (table[i][j] > longestLength) {
  //           longestLength = table[i][j];
  //           longestEndPos = i;
  //         }
  //       }
  //     }
  //   }

  //   maxSubStr = str1.slice(longestEndPos - longestLength + 1, longestEndPos + 1);
  //   return maxSubStr;
  // }

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

  return (
    <>
      {ForceDeleteBookmark}
      {ConfirmationMessage}
      <div className="archiveBackground bg-light Edit">
        <div className="card border-0">
          <span>
            <i
              onClick={handleClose}
              className="bi bi-chevron-left me-1 cursor-pointer "
            >
              Back to all documents
            </i>
          </span>
          <div className="top-row d-flex justify-content-between align-items-center mb-4">
            <h3 className="m-0">Edit Subtitle</h3>
            <div className="form-sec position-relative">
              <input
                className="form-control input"
                type="search"
                placeholder="Search in the article..."
                aria-label="Search"
              />
              <button
                type="button"
                className="btn btn-tr position-absolute end-0 top-0  mt-1"
              >
                {" "}
                <img alt="vector" width="22px" src="image/Vector.svg" />
              </button>
            </div>
          </div>
          <div className="innerhead d-flex justify-content-end align-items-end mb-5">
            <button
              type="button"
              onClick={() => {
                let newSlideTextList = [];
                for (let i = 0; i < slideListData.length; i++) {
                  let words = parseFileContents(slideListData[i].slide);
                  words[0].paragraphStart = true;
                  for (let word of words) {
                    newSlideTextList.push(word);
                  }
                }
                setSlideTextList(newSlideTextList);
                setReRun(true);
              }}
              className="btn btn-tr"
            >
              Re-run
            </button>
            <div className="button-box group-new">
              <button
                type="button"
                onClick={() => setIsLtr(!isLtr)}
                className="btn btn-tr"
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
              < div className="row" >
                <div
                  className={`col-md-6 mb-2`}
                  onClick={() => {
                    setSelected(index);
                  }}
                >
                  <div
                    className={`adjustable-font box box2 ${index == selected && "EditActiveSlide"
                      }`}
                  >
                    <textarea
                      value={key?.slide}
                      onChange={(e) => {
                        let newValue = e.target.value;

                        // Perform any special handling for \r if needed
                        if (newValue.includes('\n')) {
                          newValue = newValue.replace(/\n/g, '\r'); // Example: replace \r with a visible string representation
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
                      style={{ direction: isLtr ? 'ltr' : 'rtl' }}
                    />

                    {index == selected && (
                      <i
                        onClick={() => {
                          if (key.bookmark_id !== null && key?.ID) {
                            setForceDeleteConfirm(index);
                          } else {
                            const cloneSlidedataArray = [...slideListData];
                            cloneSlidedataArray?.splice(index, 1);
                            setSlideListData(cloneSlidedataArray);
                            if (key?.ID) {
                              setDeleted([...deleted, key?.ID]);
                            }
                          }
                        }}
                        className="bi bi-trash3 delete-icon "
                        style={{ [isLtr ? 'right' : 'left']: '5px' }}
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
                          if (numberOfPreviousSlides % key.languages.length === 0) {
                            additionalOrderNumber += 1;
                          }
                          cloneSlidedataArray.splice(index + 1, 0, {
                            // slide_id: +key?.ID + 1,
                            file_uid: key?.file_uid,
                            slide: "",
                            //order_number: key?.order_number + additionalOrderNumber,
                            addedNew: true,
                          });
                          const updatedSlideListData = cloneSlidedataArray.map((slide, i) => {
                            const updatedOrderNumber = Math.floor(i / key.languages.length);
                            return {
                              ...slide, // Spread the original slide object to create a new one
                              order_number: updatedOrderNumber, // Update the order_number property
                              languages: key.languages
                            };
                          });
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
                      isLtr={isLtr}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div>
          {reRun && (
            <SlideSplit
              tags={slideTextList}
              visible={false}
              updateSplitTags={setUpdatedSlideTextList}
              method={"custom_file"}
            />
          )}
        </div>
      </div >
    </>
  );
};

export default EditArcive;
