import { useCallback, useEffect, useRef } from "react";

// Scales a fixed 1920px-wide inner element down to its container's width.
// Shared by the subtitle/question slide and the karaoke slide renderers.
// onScale(scale, outer, inner) applies any scale-dependent styles (height, stripes, ...).
// observe: attach a ResizeObserver on the container. Only needed where the
// container can resize independently of the window (karaoke's content-driven
// height). Subtitle/question slides fill the page width and rescale on window
// resize only — observing them would add a per-row observer to the long
// virtualized lists and cause scroll jank.
export function useScaledContainer(onScale, { observe = false } = {}) {
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
    let ro;
    if (observe && outerRef.current) {
      ro = new ResizeObserver(apply);
      ro.observe(outerRef.current);
    }
    return () => {
      window.removeEventListener("resize", apply);
      if (ro) ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [apply, observe]);

  return { outerRef, innerRef };
}
