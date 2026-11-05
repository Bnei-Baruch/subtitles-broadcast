/* eslint-disable testing-library/no-node-access, testing-library/no-container -- layout test needs raw DOM */
import { render, act } from "@testing-library/react";
import { Slide } from "./Slide";

// jsdom has no layout: fake a bar whose height follows its line count, and a
// ResizeObserver we fire by hand (fakes stay in this file; Jest isolates files).
const observers = [];
beforeAll(() => {
  global.ResizeObserver = class {
    constructor(cb) { this.cb = cb; this.els = []; observers.push(this); }
    observe(el) { this.els.push(el); }
    disconnect() { this.els = []; }
  };
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() { return this.querySelectorAll(".karaoke-line").length * 110; },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1920 });
});

// The browser fires only for the box whose size changed: the inner bar.
const resizeBar = () => act(async () => {
  observers.filter((o) => o.els.some((el) => el.classList.contains("karaoke-slide-inner"))).forEach((o) => o.cb());
  await new Promise((r) => requestAnimationFrame(r));
});

test("karaoke bar follows its line count (1 → 2 → 1 lines)", async () => {
  const { container, rerender } = render(<Slide slide_type="karaoke" content="כתר וחוכמה הן" />);
  await resizeBar();
  const outer = container.querySelector(".karaoke-slide-outer");
  expect(outer.style.height).toBe("110px");
  rerender(<Slide slide_type="karaoke" content={"גלגלתא ועיני\nשלמעלה מאח\"פ"} />);
  await resizeBar();
  expect(outer.style.height).toBe("220px");
  rerender(<Slide slide_type="karaoke" content="עשר הספירות הן" />);
  await resizeBar();
  expect(outer.style.height).toBe("110px");
});
