import React, { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { BookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";

const BookContent = ({
  setActivatedTab,
  activatedTab,

  contents,
  isLtr,
  targetItemId,
}) => {
  const dispatch = useDispatch();
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
        +activatedTab >= 0 &&
        contents?.slides?.map((item, index) => (
          <>
            <div
              onClick={() => {
                const activeSlide =
                  JSON.parse(localStorage.getItem("activeSlideFileUid")) || [];
                dispatch(
                  BookmarkSlide({
                    file_uid: item.file_uid,
                    slide_id: item.ID,
                    update: true,
                    order: +item.order_number,
                  })
                );
                const newData = activeSlide.map((key) =>
                  key.fileUid === item.file_uid
                    ? {
                        fileUid: item.file_uid,
                        activeSlide: +item.order_number + 1,
                      }
                    : key
                );
                localStorage.setItem(
                  "activeSlideFileUid",
                  JSON.stringify(newData)
                );
                setActivatedTab(+item?.order_number + 1);
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
