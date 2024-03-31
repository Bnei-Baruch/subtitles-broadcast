import React, { useEffect, useRef } from "react";
import markdownit from "markdown-it";

export const Slide = ({ content, isLtr }) => {
  const outerRef = useRef();
  const slideRef = useRef();
  const md = markdownit();

  const handleResize = () => {
    const scale = outerRef.current.clientWidth / 1920;
    slideRef.current.style.transform = `scale(${scale})`;
    slideRef.current.style.transformOrigin = "top left";
    outerRef.current.style.height = `${scale * 310}px`;

    console.log("Updating scale", slideRef.current.style.transform);
  };

  useEffect(() => {
    console.log(outerRef.current); // logs <div>I'm an element</div>
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    console.log("update html", content);
    slideRef.current.innerHTML = md.render(content);
  }, [content, md]);

  return (
    <div ref={outerRef} className="slide-container">
      <div
        ref={slideRef}
        className={`slide-content ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}
      ></div>
    </div>
  );
};
