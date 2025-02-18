// List.js
import React, { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";
import { UnBookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";
import { MAX_SLIDE_LIMIT } from "../Utils/Const";
import { useSelector } from "react-redux";
import { setUserSelectedSlide } from "../Redux/MQTT/mqttSlice";
import LoadingOverlay from "../Components/LoadingOverlay";
import { updateMergedUserSettings } from "../Redux/UserSettings/UserSettingsSlice";

const ItemTypes = {
  CARD: "card",
};

const DraggableItem = ({
  parentId,
  text,
  parentIndex,
  moveCard,
  parentBookmarkFileUid,
  parentBookmarkId,
  setIsLtr,
  parentSlideId,
}) => {
  const [loading, setLoading] = useState(false);
  const bookmarkList = useSelector((state) => state.ArchiveList.bookmarkList);

  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );
  const dispatch = useDispatch();
  const [, ref] = useDrag({
    type: ItemTypes.CARD,
    item: { parentId, parentIndex },
  });

  const userSettings = useSelector((state) => state.userSettings.userSettings);
  const userSelectedFileUID = userSettings?.selected_file_uid || null;
  const selected = userSelectedFileUID === parentBookmarkFileUid;

  const [, drop] = useDrop({
    accept: ItemTypes.CARD,
    hover: (draggedItem) => {
      if (draggedItem.index !== parentIndex) {
        moveCard(draggedItem.index, parentIndex);
        draggedItem.index = parentIndex;
      }
    },
  });

  const handleBookMarkClick = (targetBookmarkFileUid, targetSlideId) => {
    setLoading(true);

    dispatch(
      updateMergedUserSettings({
        selected_slide_id: targetSlideId,
        selected_file_uid: targetBookmarkFileUid,
      })
    );

    dispatch(
      GetSubtitleData({
        file_uid: targetBookmarkFileUid,
        limit: MAX_SLIDE_LIMIT,
      })
    )
      .then((response) => {
        if (!bookmarkList?.data) return;
        // ✅ Find the bookmarked slide_id for this file
        const bookmark = bookmarkList?.data?.find(
          (b) => b.file_uid === targetBookmarkFileUid
        );

        if (bookmark) {
          const selectedSlide = response.payload.data.slides.find(
            (slide) => slide.ID === bookmark.slide_id
          );

          if (selectedSlide) {
            dispatch(setUserSelectedSlide(selectedSlide));
          }
        }
      })
      .finally(() => {
        //
        setLoading(false);
      });
  };

  return (
    <>
      <LoadingOverlay loading={loading} />
      <div
        className={
          "d-flex justify-content-between cursor-pointer" +
          (selected ? " bookmark-selected" : "")
        }
        ref={(node) => ref(drop(node))}
        style={{
          padding: "8px",
          border: "1px solid #ccc",
          marginBottom: "4px",
          position: "relative", // ✅ Allow overlay to be positioned properly
          zIndex: loading ? 1000 : "auto", // ✅ Ensure overlay is above everything
        }}
      >
        <i className="bi bi-grip-vertical me-3" />
        <i
          onClick={() =>
            dispatch(
              UnBookmarkSlide({
                bookmark_id: parentBookmarkId,
                language: broadcastLangObj.label,
              })
            )
          }
          className="bi bi-trash"
        />
        <span
          className="text-truncate mx-3 text-primary bookmarkTruncate "
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={text}
          style={{ width: "600px" }}
          onClick={() =>
            handleBookMarkClick(parentBookmarkFileUid, parentSlideId)
          }
        >
          {text}
        </span>
      </div>
    </>
  );
};

export default DraggableItem;
