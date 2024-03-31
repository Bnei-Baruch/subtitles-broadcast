import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect } from "react";
import markdownit from "markdown-it";

const SlideSplit = ({
  tags,
  visible,
  updateSplitTags,
  method
}) => {
  const index = useRef(0);
  const slideTags = useRef([]);
  const desiredContainerHeight = 310;
  const divIdPrefix = "slide";
  const divRefs = useRef([]);
  const nextTag = useRef(null);
  const currentContent = useRef("");
  const previousParagraphStartsWithIntent = useRef("");

  useEffect(() => {
    const md = markdownit({ html: true });
    const createNewDiv = (tagList) => {
      const newDiv = document.createElement("div");
      newDiv.className = divIdPrefix + " slide-content";
      newDiv.id = divIdPrefix + "_" + index.current;
      newDiv.style.height = "unset";
      newDiv.style.minHeight = "310px";
      newDiv.style.position = "relative";
      newDiv.style.outline = "solid";
      newDiv.style.transform = "scale(0.5)";
      newDiv.style.transformOrigin = "top left";
      if (!visible) {
        newDiv.style.position = "absolute";
        newDiv.style.visibility = "hidden";
      }
      nextTag.current = tagList.shift();
      if (method === "custom_file") {
        if (nextTag.current.word === "<br/>") {
          nextTag.current.word = "";
        }
      } else if (method === "source_url") {
        if (nextTag.current.tagName === "H1") {
          nextTag.current.word = "# " + nextTag.current.word;
        }
      }

      currentContent.current = nextTag.current.word;
      if (method === "custom_file") {
        currentContent.current += " ";
      }
      // Append the new div to the container
      const container = divRefs.current[0] && divRefs.current[0].parentNode;
      if (container) {
        container.appendChild(newDiv);
      }
      // Save the reference to the new div
      divRefs.current[index.current++] = newDiv;
      // Check and add text for the new div
      if (tagList.length > 0) {
        checkAndAddText(newDiv, tagList);
      }
    };
    const checkAndAddText = (currentDiv, tags) => {
      while (tags.length > 0) {
        if (currentDiv.clientHeight <= desiredContainerHeight) {
          nextTag.current = tags.shift();
          if (nextTag.current.word === "<br/>") {
            nextTag.current.word = "";
          }
          if (nextTag.current.paragraphStart) {
            if (method === "custom_file") {
              currentContent.current = currentContent.current.trim();
            }
            currentContent.current += "\n\n";
            if (nextTag.current.tagName === "H1") {
              nextTag.current.word = "# " + nextTag.current.word;
            }
          }
          currentContent.current += nextTag.current.word;
          if (method === "custom_file") {
            currentContent.current += " ";
          }
          currentDiv.innerHTML = md.render(currentContent.current);
          if (tags.length === 0 && currentContent.current.length > 0) {
            slideTags.current = [...slideTags.current, currentContent.current];
          }
        } else {
          // If the height limit is reached, create a new div
          let lengthToRemove = nextTag.current.word.length;
          if (method === "custom_file") {
            lengthToRemove += 1;
          }
          currentContent.current = currentContent.current.slice(
            0,
            -lengthToRemove
          );
          let slideContentArrary = currentContent.current.split("\n\n");
          previousParagraphStartsWithIntent.current =
            slideContentArrary[slideContentArrary.length - 1];
          currentDiv.innerHTML = md.render(currentContent.current);
          slideTags.current = [...slideTags.current, currentContent.current];
          tags.unshift(nextTag.current);
          createNewDiv(tags);
        }
      }
    };

    // Initial creation of divs
    if (tags && tags.length > 0) {
      createNewDiv(tags);
    }
    updateSplitTags(slideTags.current);
    // remove rendered divs
    if (divRefs.current.length > 1) {
      divRefs.current.forEach((div) => {
        div.remove();
      });
    }
  }, [tags, visible, updateSplitTags]);
  return tags
    ? /*#__PURE__*/ _jsx("div", {
        ref: (el) => (divRefs.current[0] = el),
      })
    : null;
};

export default SlideSplit;
