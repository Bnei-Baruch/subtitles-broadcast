import React, { useEffect, useRef } from "react";

const BookContent = ({ bookTitle, lastActivated, contents, isLtr }) => {
  const focusSlides = useRef();
  // useEffect(() => {
  //   if (focusSlides.current) {
  //     focusSlides.current.focus();
  //   }
  // }, []);
  return (
    <>
      {contents?.length > 0 &&
        +localStorage.getItem("activeSlideFileUid") &&
        contents.map((item, index) => (
          <div
            ref={
              +localStorage.getItem("activeSlideFileUid") ===
                item.order_number && "activeSlide"
                ? focusSlides
                : ""
            }
            className={`box-content   ${
              isLtr ? "ChangeToLtr" : "ChangeToRtl"
            } ${
              +localStorage.getItem("activeSlideFileUid") ===
                item.order_number && "activeSlide"
            }`}
          >
            <bdo dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}>
              {item?.slide}{" "}
            </bdo>
          </div>
        ))}
    </>
  );
};

export default BookContent;
