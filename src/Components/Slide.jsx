import React, { useEffect, useRef } from "react";
import { createMarkdownit } from "../Utils/SlideSplit";

export const Slide = ({ content, isLtr, searchKeyword, isQuestion }) => {
  const outerRef = useRef();
  const slideRef = useRef();
  const md = createMarkdownit();
  const backgroundColor = "#01cd27";

  const handleResize = () => {
    const scale = outerRef.current.clientWidth / 1920;
    slideRef.current.style.transform = `scale(${scale})`;
    slideRef.current.style.transformOrigin = "top left";
    outerRef.current.style.height = `${scale * 310}px`;
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    handleResize();
  });

  useEffect(() => {
    if (searchKeyword !== undefined && searchKeyword !== "") {
      const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };
      const escapedKeyword = escapeRegex(searchKeyword);
      const regex = new RegExp(escapedKeyword, "g");
      content = content.replace(
        regex,
        `<span style="background-color: ${backgroundColor};">$&</span>`,
      );
    }
    slideRef.current.innerHTML = md.render(content ? content : "");
  }, [content, md]);

  return (
    <div
      ref={outerRef}
      className={(isQuestion ? "slide-question" : "") + " slide-container"}
    >
      <div className="stripes">
        <div className="blue-stripe"></div>
        <div className="grey-stripe"></div>
      </div>
      <div
        ref={slideRef}
        className={`slide-content  ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}
      ></div>
    </div>
  );
};
