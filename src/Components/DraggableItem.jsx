// List.js
import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";
import { UnBookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";
import { MAX_SLIDE_LIMIT } from "../Utils/Const";
import { useSelector } from "react-redux";

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
  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );
  const dispatch = useDispatch();
  const [, ref] = useDrag({
    type: ItemTypes.CARD,
    item: { id, index },
  });

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
    setActivatedTab(+text?.split("/")?.at(-1) - 1);
    localStorage.setItem("fileUid", e);
    dispatch(GetSubtitleData({ file_uid: e, limit: MAX_SLIDE_LIMIT })).then(
      (response) => {
        setIsLtr(response.payload.data.slides[0].left_to_right);
      }
    );
  };

  const selected = localStorage.getItem("fileUid") === fileUid;
  return (
    <div
      className={
        "d-flex justify-content-between cursor-pointer" +
        (selected ? " bookmark-selected" : "")
      }
      ref={(node) => ref(drop(node))}
      style={{ padding: "8px", border: "1px solid #ccc", marginBottom: "4px" }}
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
  );
};

export default DraggableItem;
