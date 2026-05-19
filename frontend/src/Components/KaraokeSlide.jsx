import React, { useCallback, useEffect, useRef } from "react";
import { isNonLatinScript } from "../Utils/Common";
import "../Pages/PagesCSS/GreenWindow.css";

const isRTLLine = (line) => isNonLatinScript(line);

export const KaraokeSlide = ({ content }) => {
  const outerRef = useRef();
  const innerRef = useRef();
  const rafRef = useRef(null);

  const handleResize = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!outerRef.current || !innerRef.current) return;
      const scale = outerRef.current.clientWidth / 1920;
      const innerHeight = innerRef.current.offsetHeight;
      innerRef.current.style.transform = `scale(${scale})`;
      innerRef.current.style.transformOrigin = "left top";
      const newHeight = `${Math.round(innerHeight * scale)}px`;
      if (outerRef.current.style.height !== newHeight) {
        outerRef.current.style.height = newHeight;
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleResize]);

  const lines = (content || "").split("\n").filter((l) => l.trim() !== "");
  const primaryLine = lines[0] || "";
  const secondaryLine = lines[1] || "";
  const isSeparator = !primaryLine || /^[-_\s]+$/.test(primaryLine);

  const primaryDir = isRTLLine(primaryLine) ? "rtl" : "ltr";
  // Both lines Latin-script → same language lyrics → yellow, same size.
  // Otherwise (one line is Hebrew/Arabic/Cyrillic) → transliteration pair → white, smaller.
  const sameLang = !isRTLLine(primaryLine) && !isRTLLine(secondaryLine);
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
};

export default KaraokeSlide;
