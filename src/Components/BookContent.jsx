import React, { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { BookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { Slide } from "./Slide";
//import { debounce } from "lodash";

const BookContent = ({
  setActivatedTab,
  activatedTab,
  contents,
  isLtr,
  setSearchSlide,
}) => {
  const dispatch = useDispatch();
  const focusSlides = useRef();

  useEffect(() => {
    focusSlides?.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [contents, activatedTab]);
  return (
    <>
      {contents?.slides?.length > 0 &&
        +activatedTab >= 0 &&
        contents?.slides?.map((item, index) => (
          <>
            <div
              onClick={() => {
                setSearchSlide("");
                setActivatedTab(+item?.order_number);
                dispatch(
                  BookmarkSlide({
                    file_uid: item.file_uid,
                    slide_id: item.ID,
                    update: true,
                  })
                );
                const activeSlide =
                  JSON.parse(localStorage.getItem("activeSlideFileUid")) || [];
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
              className={`box-content d-flex cursor-pointer ${
                +activatedTab === item.order_number + 1 && "activeSlide"
              }`}
            >
              <bdo
                className={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
                dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
              >
                <Slide content={item?.slide} isLtr={isLtr}></Slide>
              </bdo>
              <span className="order-number">{+item?.order_number + 1}</span>
            </div>
          </>
        ))}
    </>
  );
};

export default BookContent;
