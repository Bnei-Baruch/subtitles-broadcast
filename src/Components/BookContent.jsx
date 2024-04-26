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
              onClick={() => {
                setSearchSlide("");
                setActivatedTab(+item?.order_number);
                localStorage.setItem("activatedTabData", +item?.order_number);

                dispatch(
                  BookmarkSlide({
                    data: {
                      file_uid: item.file_uid,
                      slide_id: item.ID,
                      update: true
                    },
                    langauge: appContextlData.broadcastLang.label
                  })
                );
              }}
              ref={+activatedTab === item.order_number ? focusSlides : null}
              className={`box-content d-flex  cursor-pointer  ${+activatedTab === item.order_number && "activeSlide"
                }`}
            >
              {/* <bdo
                className={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
                dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
              > */}
              <Slide content={item?.slide} isLtr={isLtr} searchKeyword={searchKeyword}></Slide>
              {/* </bdo> */}
              <span className="order-number">{+item?.order_number + 1}</span>
            </div>
          </>
        ))}
    </>
  );
};

export default BookContent;
