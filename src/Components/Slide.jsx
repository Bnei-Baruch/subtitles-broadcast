import React, { useCallback, useEffect, useRef } from "react";
import { createMarkdownit } from "../Utils/SlideSplit";

export const Slide = ({ content, isLtr, searchKeyword, isQuestion }) => {
  const outerRef = useRef();
  const slideRef = useRef();
  const blueStripeRef = useRef();
  const greyStripeRef = useRef();
  const md = createMarkdownit();
  const backgroundColor = "#01cd27";

  const handleResize = useCallback(() => {
    const scale = outerRef.current.clientWidth / 1920;
    slideRef.current.style.transform = `scale(${scale})`;
    slideRef.current.style.transformOrigin = "top left";
    if (isQuestion) {
      outerRef.current.style.height = `${scale * 246}px`;
    } else {
      outerRef.current.style.height = `${scale * 310}px`;
    }
    blueStripeRef.current.style.height = `${scale * 15}px`;
    greyStripeRef.current.style.height = `${scale * 15}px`;
  }, [outerRef, slideRef, blueStripeRef, greyStripeRef, isQuestion]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    let markedContent = content;
    if (searchKeyword !== undefined && searchKeyword !== "") {
      const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/ig, "\\$&");
      };
      const escapedKeyword = escapeRegex(searchKeyword);
      const regex = new RegExp(escapedKeyword, "ig");
      markedContent = content.replace(
        regex,
        `<span style="background-color: ${backgroundColor};">$&</span>`,
      );
    }
    slideRef.current.innerHTML = md.render(markedContent ? markedContent : "");
  }, [content, md, searchKeyword]);

  return (
    <div
      ref={outerRef}
      className={(isQuestion ? "slide-question" : "") + " slide-container"}
    >
      <div className="stripes">
        <div ref={blueStripeRef} className="blue-stripe"></div>
        <div ref={greyStripeRef} className="grey-stripe"></div>
      </div>
      <div
        ref={slideRef}
        className={`slide-content  ${isLtr ? "ltr" : "rtl"}`}
      ></div>
    </div>
  );
};
