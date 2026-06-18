import { useCallback, useEffect, useRef } from "react";

// Scales a fixed 1920px-wide inner element down to its container's width.
// Shared by the subtitle/question slide and the karaoke slide renderers.
// onScale(scale, outer, inner) applies any scale-dependent styles (height, stripes, ...).
export function useScaledContainer(onScale) {
  const outerRef = useRef();
  const innerRef = useRef();
  const rafRef = useRef(null);

  const apply = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const scale = outer.clientWidth / 1920;
      inner.style.transform = `scale(${scale})`;
      inner.style.transformOrigin = "top left";
      onScale(scale, outer, inner);
    });
  }, [onScale]);

  useEffect(() => {
    window.addEventListener("resize", apply);
    apply();
    const ro = new ResizeObserver(apply);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => {
      window.removeEventListener("resize", apply);
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [apply]);

  return { outerRef, innerRef };
}
