import React, { useEffect, useRef } from "react";

const BookContent = ({
  bookTitle,
  lastActivated,
  contents,
  isLtr,
  targetItemId,
}) => {
  const focusSlides = useRef();
  useEffect(() => {
    focusSlides?.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [contents, targetItemId]);
  return (
    <>
      {contents?.slides?.length > 0 &&
        +localStorage.getItem("activeSlideFileUid") &&
        contents?.slides?.map((item, index) => (
          <div
            ref={
              +localStorage.getItem("activeSlideFileUid") === item.order_number
                ? focusSlides
                : null
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
