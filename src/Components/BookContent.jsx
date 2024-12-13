import React, { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { BookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { Slide } from "./Slide";
import { useSelector } from "react-redux";

const BookContent = ({
  setActivatedTab,
  activatedTab,
  contents,
  isLtr,
  setSearchSlide,
  searchKeyword,
}) => {
  const dispatch = useDispatch();
  const focusSlides = useRef();
  const broadcastLangObj = useSelector(
    (state) => state.BroadcastParams.broadcastLang
  );

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
          <div
            key={`slide_${item.ID}`}
            id={`slide_${item.ID}`}
            source-uid={item.source_uid}
            onClick={() => {
              setSearchSlide("");
              setActivatedTab(+item?.order_number);
              localStorage.setItem("activatedTabData", +item?.order_number);

              dispatch(
                BookmarkSlide({
                  data: {
                    file_uid: item.file_uid,
                    slide_id: item.ID,
                    update: true,
                  },
                  language: broadcastLangObj.label,
                })
              );
            }}
            ref={
              +activatedTab + 1 === item.order_number + 1 ? focusSlides : null
            }
            className={`box-content d-flex  cursor-pointer  ${
              +activatedTab + 1 === +item.order_number + 1 && "activeSlide"
            }`}
          >
            {/* <bdo
                className={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
                dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
              > */}
            <Slide
              content={item?.slide}
              isLtr={
                item && typeof item.left_to_right === "boolean"
                  ? item.left_to_right
                  : isLtr
              }
              searchKeyword={searchKeyword}
              isQuestion={item?.slide_type === "question"}
            ></Slide>
            {/* </bdo> */}
            <span className="order-number">{`${
              item?.languages.length > 1
                ? item?.languages[+index % item?.languages.length]
                : item?.languages[0]
            } ${+item.order_number + 1}`}</span>
          </div>
        ))}
    </>
  );
};

export default BookContent;
