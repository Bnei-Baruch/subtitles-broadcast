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
  console.log(contents, "contents");
  return (
    <>
      {contents?.slides?.length > 0 &&
        +localStorage.getItem("activeSlideFileUid") >= 0 &&
        contents?.slides?.map((item, index) => (
          <>
            <div
              ref={
                +localStorage.getItem("activeSlideFileUid") ===
                item.order_number
                  ? focusSlides
                  : null
              }
              className={`box-content d-flex    ${
                +localStorage.getItem("activeSlideFileUid") ===
                  item.order_number && "activeSlide"
              }`}
            >
              <bdo
                className={`p-3 ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}
                dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
              >
                {item?.slide}{" "}
              </bdo>
              <span className="my-1 mx-3 text-start">
                {+item?.order_number + 1}
              </span>
            </div>
          </>
        ))}
    </>
  );
};

export default BookContent;
