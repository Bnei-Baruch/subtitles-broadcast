import React, { useCallback, useEffect, useRef } from "react";
import { createMarkdownit } from "../Utils/SlideSplit";
import { isNonLatinScript } from "../Utils/Common";
import "../Pages/PagesCSS/GreenWindow.css";

export const Slide = ({ content, isLtr, searchKeyword, isQuestion, renderer, slide_type, onOverflow = undefined }) => {
  const isKaraoke = slide_type === "karaoke";
  const outerRef = useRef();
  const slideRef = useRef();
  const blueStripeRef = useRef();
  const greyStripeRef = useRef();
  const rafRef = useRef(null);
  const md = createMarkdownit();
  const backgroundColor = "#01cd27";

  const handleResize = useCallback(() => {
    if (!outerRef.current || !slideRef.current) return;
    const scale = outerRef.current.clientWidth / 1920;
    slideRef.current.style.transform = `scale(${scale})`;
    slideRef.current.style.transformOrigin = isKaraoke ? "left top" : "top left";
    if (isKaraoke) {
      const newHeight = `${Math.round(slideRef.current.offsetHeight * scale)}px`;
      if (outerRef.current.style.height !== newHeight) {
        outerRef.current.style.height = newHeight;
      }
    } else {
      outerRef.current.style.height = `${scale * (isQuestion ? 246 : 310)}px`;
      blueStripeRef.current.style.height = `${scale * 15}px`;
      greyStripeRef.current.style.height = `${scale * 15}px`;
    }
  }, [isQuestion, isKaraoke]);

  // Subtitle/question slides rescale synchronously on window resize only
  // (exactly as before). Karaoke has a content-driven height, so it coalesces
  // via rAF and watches its container with a ResizeObserver (exactly as the old
  // KaraokeSlide). Keeping the two timings separate avoids the blink/jank a
  // unified path caused.
  useEffect(() => {
    const run = isKaraoke
      ? () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(handleResize);
        }
      : handleResize;
    window.addEventListener("resize", run);
    run();
    let ro;
    if (isKaraoke && outerRef.current) {
      ro = new ResizeObserver(run);
      ro.observe(outerRef.current);
    }
    return () => {
      window.removeEventListener("resize", run);
      if (ro) ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleResize, isKaraoke]);

  useEffect(() => {
    if (isKaraoke || !slideRef.current) return;
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
    if (onOverflow) {
      onOverflow(slideRef.current.scrollHeight > slideRef.current.clientHeight);
    }
  }, [content, md, searchKeyword, isKaraoke, onOverflow]);

  if (isKaraoke) {
    const lines = (content || "").split("\n").filter((l) => l.trim() !== "");
    const primaryLine = lines[0] || "";
    const secondaryLine = lines[1] || "";
    const isSeparator = !primaryLine || /^[-_\s]+$/.test(primaryLine);
    const primaryDir = isNonLatinScript(primaryLine) ? "rtl" : "ltr";
    // Both lines Latin-script → same-language lyrics → yellow, same size.
    // Otherwise (one line Hebrew/Arabic/Cyrillic) → transliteration pair → white.
    const sameLang = !isNonLatinScript(primaryLine) && !isNonLatinScript(secondaryLine);
    const secondaryColor = sameLang ? "#ffe566" : "#ffffff";
    return (
      <div key="karaoke" ref={outerRef} className="karaoke-slide-outer">
        <div ref={slideRef} className="karaoke-slide-inner">
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
      key="subtitle"
      ref={outerRef}
      className={(isQuestion ? "slide-question" : "") + " slide-container renderer-" + renderer}
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
