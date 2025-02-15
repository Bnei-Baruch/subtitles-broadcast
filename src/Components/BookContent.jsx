import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { BookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { Slide } from "./Slide";
import { useSelector } from "react-redux";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import { setUserSelectedSlide } from "../Redux/MQTT/mqttSlice";
import LoadingOverlay from "../Components/LoadingOverlay";

const BookContent = ({
  setActivatedTab,
  activatedTab,
  contents,
  isLtr,
  setSearchSlide,
  searchKeyword,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const focusSlides = useRef();
  const [loading, setLoading] = useState(false);
  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );

  useEffect(() => {
    focusSlides?.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [contents, activatedTab]);

  const handleEditSlide = (slide) => {
    const fileUid = slide.file_uid;
    const slideId = slide.ID;
    const editUrl = `/archive/edit?file_uid=${fileUid}&slide_id=${slideId}`;

    localStorage.setItem("file_uid_for_edit_slide", fileUid);

    navigate(editUrl, {
      state: { previousLocation: window.location.pathname },
    });
  };

  function handleSlideClick(
    setLoading,
    setSearchSlide,
    setActivatedTab,
    item,
    dispatch,
    broadcastLangObj
  ) {
    setLoading(true); // ✅ Show loading
    setSearchSlide("");
    setActivatedTab(+item?.order_number);
    localStorage.setItem("activeSlideFileUid", +item?.ID);

    // ✅ Dispatch Redux action to update `selectedSubtitleSlide`
    dispatch(setUserSelectedSlide(item));

    dispatch(
      BookmarkSlide({
        data: {
          file_uid: item.file_uid,
          slide_id: item.ID,
          update: true,
        },
        language: broadcastLangObj.label,
      })
    ).finally(() => setLoading(false));
  }

  return (
    <>
      <LoadingOverlay loading={loading} />
      {contents?.slides?.length > 0 &&
        +activatedTab >= 0 &&
        contents?.slides?.map((item, index) => (
          <div
            key={`slide_${item.ID}`}
            id={`slide_${item.ID}`}
            source-uid={item.source_uid}
            onClick={() => {
              handleSlideClick(
                setLoading,
                setSearchSlide,
                setActivatedTab,
                item,
                dispatch,
                broadcastLangObj
              ); // ✅ Hide loading after completion
            }}
            ref={
              +activatedTab + 1 === item.order_number + 1 ? focusSlides : null
            }
            className={`box-content d-flex  cursor-pointer  ${
              +activatedTab + 1 === +item.order_number + 1 && "activeSlide"
            }`}
          >
            {/* <bdo
                className={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
                dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
              > */}
            <Slide
              content={item?.slide}
              isLtr={
                item && typeof item.left_to_right === "boolean"
                  ? item.left_to_right
                  : isLtr
              }
              searchKeyword={searchKeyword}
              isQuestion={item?.slide_type === "question"}
            ></Slide>
            {/* </bdo> */}
            <span className="order-number">{`${
              item?.languages.length > 1
                ? item?.languages[+index % item?.languages.length]
                : item?.languages[0]
            } ${+item.order_number + 1}`}</span>
            <IconButton
              className="edit-slide-button"
              onClick={() => handleEditSlide(item)}
            >
              <EditIcon />
            </IconButton>
          </div>
        ))}
    </>
  );
};

export default BookContent;
