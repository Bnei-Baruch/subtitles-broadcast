// List.js
import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { useDispatch } from "react-redux";
import { UnBookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { GetSubtitleData } from "../Redux/Subtitle/SubtitleSlice";

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
}) => {
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
  // const handleBookMarkClick = (e) => {
  //   const activeSlide =
  //     JSON.parse(localStorage.getItem("activeSlideFileUid")) || [];
  //   if (Array.isArray(activeSlide)) {
  //     const findActiveSlideId = activeSlide?.find((key) => key?.fileUid == e);
  //     if (findActiveSlideId) {
  //       setActivatedTab(findActiveSlideId?.activeSlide);
  //     } else {
  //       const newData = [
  //         ...activeSlide,
  //         { fileUid: e, activeSlide: +text?.split("/")?.at(-1) },
  //       ];
  //       localStorage.setItem("activeSlideFileUid", JSON.stringify(newData));
  //       setActivatedTab(+text?.split("/")?.at(-1) + 1);
  //     }
  //   } else {
  //     const newData = [{ fileUid: e, activeSlide: +text?.split("/")?.at(-1) }];
  //     localStorage.setItem("activeSlideFileUid", JSON.stringify(newData));
  //     setActivatedTab(+text?.split("/")?.at(-1) + 1);
  //   }
  //   dispatch(GetSubtitleData(e));
  // };

  const handleBookMarkClick = (e) => {
    setActivatedTab(+text?.split("/")?.at(-1));
    dispatch(GetSubtitleData(e));
  };
  return (
    <div
      className="d-flex justify-content-between cursor-pointer"
      ref={(node) => ref(drop(node))}
      style={{ padding: "8px", border: "1px solid #ccc", marginBottom: "4px" }}
    >
      <i
        onClick={() => dispatch(UnBookmarkSlide(bookmarkDelete))}
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
