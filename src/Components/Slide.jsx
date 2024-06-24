import React, { useEffect, useRef } from "react";
import markdownit from "markdown-it";

export const Slide = ({ content, isLtr, searchKeyword, mode, slideTextList, setSlideTextList, orderNumber }) => {
  const outerRef = useRef();
  const slideRef = useRef();
  const md = markdownit({ html: true });
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
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      const escapedKeyword = escapeRegex(searchKeyword);
      const regex = new RegExp(escapedKeyword, 'g');
      content = content.replace(regex, `<span style="background-color: ${backgroundColor};">$&</span>`);
    }
    if (mode !== undefined && mode === "edit") {
      if (slideTextList.length > 0 && orderNumber !== undefined && slideTextList[orderNumber] !== content) {
        slideTextList[orderNumber] = content;
        let newSlideTextList = []
        for (let slide of slideTextList) {
          const words = parseFileContents(slide);
          for (let word of words) {
            newSlideTextList.push(word);
          }
        }
        setSlideTextList(newSlideTextList);
      } else {
        const words = parseFileContents(content);
        for (let word of words) {
          slideTextList.push(word);
        }
        setSlideTextList(slideTextList);
      }
    }
    slideRef.current.innerHTML = md.render(content);
  }, [content, md]);

  const parseFileContents = (fileContents) => {
    const wordsArray = fileContents.replace(/\r/g, " <br/> ").split(/\s+/);
    let structuredArray = [];
    let previousWord = "";
    wordsArray.forEach((word, index) => {
      const elementObject = {
        paragraphStart: previousWord === "<br/>" && word !== "<br/>",
        tagName: "",
        word: word,
      };
      structuredArray.push(elementObject);
      previousWord = word;
    });
    return structuredArray;
  };

  return (
    <div ref={outerRef} className="slide-container">
      <div
        ref={slideRef}
        className={`slide-content  ${isLtr ? "ChangeToLtr" : "ChangeToRtl"}`}
      ></div>
    </div>
  );
};
