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
  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );
  const contents = useSelector((state) => state.SubtitleData.contentList.data);
  const appSettings = useSelector((state) => state.userSettings.userSettings);
  const lastSelectedSlideID = appSettings?.last_selected_slide_id || null;
  const lastSelectedFileUID = appSettings?.last_selected_file_uid || null;
  const [activeSlideID, setActiveSlideID] = useState(null);

  useEffect(() => {
    setActiveSlideID(lastSelectedSlideID);
  }, [lastSelectedSlideID]);

  useEffect(() => {
    if (lastSelectedFileUID) {
      dispatch(
        GetSubtitleData({
          lastSelectedFileUID,
          keyword: "",
          limit: MAX_SLIDE_LIMIT,
        })
      ).then((response) => {
        if (response.payload?.data?.slides?.length > 0) {
          const selectedSlide = response.payload.data.slides.find(
            (slide) => slide.ID === lastSelectedSlideID
          );

          if (selectedSlide) {
            dispatch(setUserSelectedSlide(selectedSlide));
          }
        }
      });
    }
  }, [lastSelectedFileUID, dispatch, lastSelectedSlideID]);

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
          last_selected_slide_id: item.ID,
          last_selected_file_uid: item.file_uid,
        })
      );

      dispatch(
        BookmarkSlide({
          data: {
            file_uid: item.file_uid,
            slide_id: item.ID,
            update: true,
          },
          language: broadcastLangObj.label,
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
                handleSlideClick(
                  setLoading,
                  setSearchSlide,
                  item,
                  dispatch,
                  broadcastLangObj
                );
              }}
              ref={
                +slideOrderNumber + 1 === item.order_number + 1
                  ? focusSlides
                  : null
              }
              className={`box-content d-flex cursor-pointer ${activeSlideID === item.ID ? "activeSlide" : ""}`}
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
