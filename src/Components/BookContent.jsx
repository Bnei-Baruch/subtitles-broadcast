import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { BookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";
import { Slide } from "./Slide";
import { useSelector } from "react-redux";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import { setUserSelectedSlide } from "../Redux/MQTT/mqttSlice";
import LoadingOverlay from "../Components/LoadingOverlay";
import debugLog from "../Utils/debugLog";
import { MAX_SLIDE_LIMIT } from "../Utils/Const";
import { updateMergedUserSettings } from "../Redux/UserSettings/UserSettingsSlice";

const BookContent = ({
  slideOrderNumber,
  isLtr,
  setSearchSlide,
  searchKeyword,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const focusSlides = useRef();
  const [loading, setLoading] = useState(false);
  const contents = useSelector((state) => state.SubtitleData.contentList.data);
  const userSettings = useSelector((state) => state.userSettings.userSettings);
  const userSelectedSlideId = userSettings?.selected_slide_id || null;
  const userSelectedFileUID = userSettings?.selected_file_uid || null;
  const [activeSlideId, setActiveSlideID] = useState(null);
  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he"
  );

  useEffect(() => {
    setActiveSlideID(userSelectedSlideId);
  }, [userSelectedSlideId]);

  useEffect(() => {
    const targetSlide = document.getElementById(`slide_${activeSlideId}`);
    if (targetSlide) {
      targetSlide.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [contents, activeSlideId]);

  useEffect(() => {
    if (userSelectedFileUID) {
      dispatch(
        GetSubtitleData({
          file_uid: userSelectedFileUID,
          keyword: "",
          limit: MAX_SLIDE_LIMIT,
        })
      ).then((response) => {
        if (response.payload?.data?.slides?.length > 0) {
          const selectedSlide = response.payload.data.slides.find(
            (slide) => slide.ID === userSelectedSlideId
          );

          if (selectedSlide) {
            dispatch(setUserSelectedSlide(selectedSlide));
          }
        }
      });
    }
  }, [userSelectedFileUID, dispatch, userSelectedSlideId]);

  const handleEditSlide = (slide) => {
    const fileUid = slide.file_uid;
    const slideId = slide.ID;
    const editUrl = `/archive/edit?file_uid=${fileUid}&slide_id=${slideId}`;

    localStorage.setItem("file_uid_for_edit_slide", fileUid);

    navigate(editUrl, {
      state: { previousLocation: window.location.pathname },
    });
  };

  const handleSlideClick = async (
    setLoading,
    setSearchSlide,
    item,
    dispatch
  ) => {
    setLoading(true);
    setSearchSlide("");

    dispatch(setUserSelectedSlide(item));
    setActiveSlideID(item.ID);

    try {
      dispatch(
        updateMergedUserSettings({
          selected_slide_id: item.ID,
          selected_file_uid: item.file_uid,
        })
      );

      dispatch(
        BookmarkSlide({
          data: {
            file_uid: item.file_uid,
            slide_id: item.ID,
            update: true,
          },
          language: broadcastLangCode,
        })
      ).finally(() => {
        // ✅ Hide loading
        setLoading(false);
      });
    } catch (error) {
      debugLog("❌ updateMergedUserSettings Error:", error);
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay loading={loading} />
      {contents?.slides?.length > 0 && (
        <div className="grid-container">
          {contents?.slides?.map((item, index) => (
            <div
              key={`slide_${item.ID}`}
              id={`slide_${item.ID}`}
              source-uid={item.source_uid}
              onClick={() => {
                handleSlideClick(setLoading, setSearchSlide, item, dispatch);
              }}
              ref={
                +slideOrderNumber + 1 === item.order_number + 1
                  ? focusSlides
                  : null
              }
              className={`box-content d-flex cursor-pointer ${activeSlideId === item.ID ? "activeSlide" : ""}`}
            >
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
        </div>
      )}
    </>
  );
};

export default BookContent;
