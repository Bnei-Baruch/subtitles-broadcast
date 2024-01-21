import React, { useEffect, useRef } from "react";

const BookContent = ({
  setActivatedTab,
  activatedTab,
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
  console.log(activatedTab, "contents");
  return (
    <>
      {contents?.slides?.length > 0 &&
        +activatedTab >= 0 &&
        contents?.slides?.map((item, index) => (
          <>
            <div
              onClick={() => {
                setActivatedTab(+item?.order_number + 1);
                localStorage.setItem(
                  "activeSlideFileUid",
                  +item?.order_number + 1
                );
              }}
              ref={+activatedTab === item.order_number + 1 ? focusSlides : null}
              className={`box-content d-flex  cursor-pointer  ${
                +activatedTab === item.order_number + 1 && "activeSlide"
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
