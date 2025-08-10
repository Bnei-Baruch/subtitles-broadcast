import React, { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";
import { UnBookmarkSlide } from "../Redux/BookmarksSlice";
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";
import { useSelector } from "react-redux";
import { updateMergedUserSettings } from "../Redux/UserSettingsSlice";
import { publishSubtitle } from "../Utils/UseMqttUtils";

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
  bookmarkDeleted,
}) => {
  const dispatch = useDispatch();

  const [, ref] = useDrag({
    type: ItemTypes.CARD,
    item: { parentId, parentIndex },
  });

  const {
    language,
    channel,
    selected_file_uid: userSelectedFileUID,
  } = useSelector((state) => state.userSettings.userSettings);
  const selected = userSelectedFileUID === parentBookmarkFileUid;

  const subtitlesDisplayMode = useSelector((state) => state.mqtt.subtitlesDisplayMode);
  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);

  const [, drop] = useDrop({
    accept: ItemTypes.CARD,
    hover: (draggedItem) => {
      if (draggedItem.index !== parentIndex) {
        moveCard(draggedItem.index, parentIndex);
        draggedItem.index = parentIndex;
      }
    },
  });

  const handleBookmarkClick = (targetBookmarkFileUid, targetSlideId) => {
    dispatch(updateMergedUserSettings({
      selected_slide_id: targetSlideId,
      selected_file_uid: targetBookmarkFileUid,
    }));
  };

  return (
    <>
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
          position: "relative",
        }}
      >
        <i className="bi bi-grip-vertical me-3" />
        <i
          onClick={() => {
            dispatch(UnBookmarkSlide({ bookmark_id: parentBookmarkId })).then(() => bookmarkDeleted());
          }}
          className="bi bi-trash"
        />
        <span
          className="text-truncate mx-3 text-primary bookmarkTruncate "
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={text}
          style={{ width: "600px" }}
          onClick={() => handleBookmarkClick(parentBookmarkFileUid, parentSlideId)}
        >
          {text}
        </span>
      </div>
    </>
  );
};

export default DraggableItem;
