import React, { useContext, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { BookmarkSlide } from "../Redux/ArchiveTab/ArchiveSlice";
import { Slide } from "./Slide";
//import { debounce } from "lodash";
import AppContext from "../AppContext";

const BookContent = ({
  setActivatedTab,
  activatedTab,
  contents,
  isLtr,
  setSearchSlide,
  searchKeyword,
}) => {
  const appContextlData = useContext(AppContext);
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
                    language: appContextlData.broadcastLang.label,
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
                  item && item.slide && item.slide.left_to_right ? false : true
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
          </>
        ))}
    </>
  );
};

export default BookContent;
