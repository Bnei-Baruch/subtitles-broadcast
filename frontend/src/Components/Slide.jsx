import React, { useCallback, useEffect, useRef } from "react";
import { createMarkdownit } from "../Utils/SlideSplit";
import { isNonLatinScript } from "../Utils/Common";
import { useScaledContainer } from "../Utils/useScaledContainer";
import "../Pages/PagesCSS/GreenWindow.css";

export const Slide = ({ content, isLtr, searchKeyword, isQuestion, renderer, slide_type, onOverflow = undefined }) => {
  const isKaraoke = slide_type === "karaoke";
  const blueStripeRef = useRef();
  const greyStripeRef = useRef();
  const md = createMarkdownit();
  const backgroundColor = "#01cd27";

  const onScale = useCallback((scale, outer, inner) => {
    if (isKaraoke) {
      // Content-driven height: the karaoke bar has no fixed line count. Only
      // write when it actually changes — the ResizeObserver watches `outer`, so
      // an unconditional write would feed back into itself (blink/jank).
      const h = `${Math.round(inner.offsetHeight * scale)}px`;
      if (outer.style.height !== h) outer.style.height = h;
      return;
    }
    outer.style.height = `${scale * (isQuestion ? 246 : 310)}px`;
    if (blueStripeRef.current) blueStripeRef.current.style.height = `${scale * 15}px`;
    if (greyStripeRef.current) greyStripeRef.current.style.height = `${scale * 15}px`;
  }, [isKaraoke, isQuestion]);

  const { outerRef, innerRef } = useScaledContainer(onScale, { observe: isKaraoke });

  useEffect(() => {
    if (isKaraoke || !innerRef.current) return;
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
    innerRef.current.innerHTML = md.render(markedContent ? markedContent : "");
    if (onOverflow) {
      onOverflow(innerRef.current.scrollHeight > innerRef.current.clientHeight);
    }
  }, [content, md, searchKeyword, isKaraoke, innerRef, onOverflow]);

  if (isKaraoke) {
    const lines = (content || "").split("\n").filter((l) => l.trim() !== "");
    const primaryLine = lines[0] || "";
    const secondaryLine = lines[1] || "";
    const isSeparator = !primaryLine || /^[-_\s]+$/.test(primaryLine);
    const primaryDir = isNonLatinScript(primaryLine) ? "rtl" : "ltr";
    // Both lines Latin-script → same-language lyrics → yellow, same size.
    // Otherwise (one line Hebrew/Arabic/Cyrillic) → transliteration pair → white, smaller.
    const sameLang = !isNonLatinScript(primaryLine) && !isNonLatinScript(secondaryLine);
    const secondaryColor = sameLang ? "#ffe566" : "#ffffff";
    return (
      <div ref={outerRef} className="karaoke-slide-outer">
        <div ref={innerRef} className="karaoke-slide-inner">
          <div className="karaoke-bar">
            {!isSeparator && primaryLine && (
              <div className="karaoke-line karaoke-line-primary" style={{ direction: primaryDir }}>{primaryLine}</div>
            )}
            {!isSeparator && secondaryLine && (
              <div
                className="karaoke-line karaoke-line-secondary"
                style={{ color: secondaryColor, fontSize: sameLang ? "88px" : undefined }}
              >{secondaryLine}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className={(isQuestion ? "slide-question" : "") + " slide-container renderer-" + renderer}
    >
      <div className="stripes">
        <div ref={blueStripeRef} className="blue-stripe"></div>
        <div ref={greyStripeRef} className="grey-stripe"></div>
      </div>
      <div
        ref={innerRef}
        className={`slide-content  ${isLtr ? "ltr" : "rtl"}`}
      ></div>
    </div>
  );
};
