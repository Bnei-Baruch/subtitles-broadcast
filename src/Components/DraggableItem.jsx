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

const ItemTypes = {
  CARD: "card",
};

const DraggableItem = ({
  id,
  text,
  index,
  moveCard,
  fileUid,
  bookmarkDelete,
  setActivatedTab,
  setIsLtr,
}) => {
  const [loading, setLoading] = useState(false);
  const bookmarkList = useSelector((state) => state.ArchiveList.bookmarkList);

  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );
  const dispatch = useDispatch();
  const [, ref] = useDrag({
    type: ItemTypes.CARD,
    item: { id, index },
  });

  const appSettings = useSelector((state) => state.userSettings.userSettings);
  const lastSelectedFileUID = appSettings?.last_selected_file_uid || null;

  const selected =
    useSelector((state) => state.ArchiveList.lastSelectedFileUID) ===
    lastSelectedFileUID;

  const [, drop] = useDrop({
    accept: ItemTypes.CARD,
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveCard(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const handleBookMarkClick = (e) => {
    setLoading(true); // ✅ Show loading

    dispatch(GetSubtitleData({ file_uid: e, limit: MAX_SLIDE_LIMIT }))
      .then((response) => {
        setIsLtr(response.payload.data.slides[0].left_to_right);

        if (!bookmarkList?.data) return;
        // ✅ Find the bookmarked slide_id for this file
        const bookmark = bookmarkList?.data?.find(
          (b) => b.file_uid === fileUid
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
      .finally(() => setLoading(false)); // ✅ Hide loading after completion
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
                bookmark_id: bookmarkDelete,
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
          onClick={() => handleBookMarkClick(fileUid)}
        >
          {text}
        </span>
      </div>
    </>
  );
};

export default DraggableItem;
