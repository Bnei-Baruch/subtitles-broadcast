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
  targetItemId,
}) => {
  const dispatch = useDispatch();
  const focusSlides = useRef();
  /*const handleResize = () => {
    // Logic to handle window resize
    console.log(window.innerWidth, window.innerHeight);
    const updateElementStyles = () => {
      const elementsWithActiveSlideClass = document.getElementsByClassName('box-content');
      for (let i = 0; i < elementsWithActiveSlideClass.length; i++) {
        elementsWithActiveSlideClass[i].style.transform = `scale(0.5)`;
        elementsWithActiveSlideClass[i].style.transformOrigin = 'top left';
      }
    };
    updateElementStyles();
  };*/
  /*useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);*/
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
              className={`box-content d-flex cursor-pointer ${+activatedTab === item.order_number + 1 && "activeSlide"
                }`}
            >
              <bdo
                className={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
                dir={isLtr ? "ChangeToLtr" : "ChangeToRtl"}
              >
								<Slide content={item?.slide} isLtr={isLtr}></Slide>
              </bdo>
              <span className="order-number">
                {+item?.order_number + 1}
              </span>
            </div>
          </>
        ))}
    </>
  );
};

export default BookContent;
