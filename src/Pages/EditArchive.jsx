import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addNewSlide,
  deleteNewSlide,
  getEditSlideList,
  updateNewSlide,
} from "../Redux/ArchiveTab/ArchiveSlice";
import MessageBox from "../Components/MessageBox";
import { Slide } from "../Components/Slide";

const EditArcive = ({ handleClose }) => {
  const dispatch = useDispatch();
  const slideList = useSelector(getEditSlideList);

  const [slideListData, setSlideListData] = useState(slideList?.slides);
  const [selected, setSelected] = useState(0);
  const [confirmation, setConfirmation] = useState(false);
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState(null);
  const [force_delete_bookmarks, setForce_delete_bookmarks] = useState(false);
  const [deleted, setDeleted] = useState([]);
  const outerRef = useRef();
  const slideRef = useRef();

  useEffect(() => {
    setSlideListData(slideList?.slides);
  }, [slideList?.slides]);

  const handleSubmit = () => {
    const shouldDelete = deleted?.length > 0;
    const shouldForceDelete = shouldDelete && force_delete_bookmarks;

    if (shouldDelete) {
      const deleteParams = {
        force_delete_bookmarks: shouldForceDelete,
        slide_ids: deleted,
      };
      dispatch(deleteNewSlide(deleteParams));
    }

    const updateSlideList = slideListData?.map(
      ({ ID, slide, order_number }, index) => ({
        slide_id: ID,
        slide,
        order_number: index,
      })
    );

    const addNewSlideList = updateSlideList
      ?.filter(({ slide_id }) => slide_id === undefined)
      ?.map(({ slide, order_number }) => ({
        slide,
        order_number,
        file_uid: slideListData[0]?.file_uid,
      }));

    if (addNewSlideList?.length > 0) {
      dispatch(addNewSlide(addNewSlideList));
    }

    if (updateSlideList?.length > 0) {
      const updateSlideListRequest = {
        updateSlideList: updateSlideList,
        file_uid: slideListData[0]?.file_uid,
      };
      dispatch(updateNewSlide(updateSlideListRequest));
    }

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
            <div className="button-box group-new">
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
              <div className="row">
                <div
                  className={`col-md-6 mb-2`}
                  onClick={() => {
                    setSelected(index);
                  }}
                >
                  <div
                    className={`adjustable-font box box2 ${
                      index == selected && "EditActiveSlide"
                    }`}
                  >
                    <textarea
                      value={key?.slide}
                      onChange={(e) => {
                        //1) check object is new or having slideid if having slide_id, change slide data only and add to updata slide array, If it is new add in new slide array
                        const cloneSlidedataArray = [...slideListData];
                        if (key.addedNew) {
                          cloneSlidedataArray?.splice(index, 1);
                          cloneSlidedataArray?.splice(index, 0, {
                            ...key,
                            slide: e.target.value,
                          });
                          setSlideListData(cloneSlidedataArray);
                        } else {
                          cloneSlidedataArray?.splice(index, 1);
                          cloneSlidedataArray?.splice(index, 0, {
                            ...key,
                            slide: e.target.value,
                            updateSlide: true,
                          });
                          setSlideListData(cloneSlidedataArray);
                        }
                      }}
                      key={index}
                      className=""
                      // style={containerStyle}
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
                      />
                    )}
                    {index == selected && (
                      <i
                        onClick={() => {
                          const cloneSlidedataArray = [...slideListData];
                          cloneSlidedataArray.splice(index + 1, 0, {
                            // slide_id: +key?.ID + 1,
                            file_uid: key?.file_uid,
                            slide: "",
                            order_number: key?.order_number + 1,
                            addedNew: true,
                          });
                          setSlideListData(cloneSlidedataArray);
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
                    <Slide content={key?.slide} isLtr={true} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default EditArcive;
