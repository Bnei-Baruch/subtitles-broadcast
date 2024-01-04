// List.js
import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";
import { UnBookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import {
  GetSubtitleData,
  StoreFocusSlideId,
} from "../Redux/Subtitle/SubtitleSlice";

const ItemTypes = {
  CARD: "card",
};

const DraggableItem = ({ id, text, index, moveCard, fileUid }) => {
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
    dispatch(StoreFocusSlideId(14));
    dispatch(GetSubtitleData(e));
  };
  return (
    <div
      className="d-flex justify-content-between"
      ref={(node) => ref(drop(node))}
      style={{ padding: "8px", border: "1px solid #ccc", marginBottom: "4px" }}
    >
      <i
        onClick={() =>
          dispatch(UnBookmarkSlide(text.split("/").at(-1).trim("")))
        }
        className="bi bi-trash"
      />
      <span
        className="text-truncate mx-3 text-primary"
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        title={text}
        onClick={() => handleBookMarkClick(fileUid)}
      >
        {text}
      </span>
    </div>
  );
};

export default DraggableItem;
