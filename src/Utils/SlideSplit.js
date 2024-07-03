import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect } from "react";
import markdownit from "markdown-it";

const SlideSplit = ({
  tags,
  visible,
  updateSplitTags,
  method
}) => {
  let terminateCondition = 0
  let numOfRows = 0;
  let currentDivHeight = 0;
  const index = useRef(0);
  const slideTags = useRef([]);
  const desiredNumberOfRows = 3;
  const divIdPrefix = "slide";
  const divRefs = useRef([]);
  const nextTag = useRef(null);
  const currentContent = useRef("");

  useEffect(() => {
    const md = markdownit({ html: true });
    const createNewDiv = (tagList) => {
      const newDiv = document.createElement("div");
      newDiv.className = divIdPrefix + " slide-content";
      newDiv.id = divIdPrefix + "_" + index.current;
      newDiv.style.height = "unset";
      newDiv.style.position = "relative";
      newDiv.style.outline = "solid";
      newDiv.style.transform = "scale(0.5)";
      newDiv.style.transformOrigin = "top left";
      if (!visible) {
        newDiv.style.position = "absolute";
        newDiv.style.visibility = "hidden";
      }
      nextTag.current = tagList.shift();
      if (nextTag.current.word === "===") {
        currentDivHeight = 0;
        numOfRows = 0;
        nextTag.current = tagList.shift();
      }
      if (method === "custom_file") {
        if (nextTag.current.word === "<br/>") {
          nextTag.current.word = "";
        }
      } else if (method === "source_url") {
        if (nextTag.current.tagName === "H1") {
          nextTag.current.word = "### " + nextTag.current.word;
        }
        if (nextTag.current.tagName.match(/^(H[2-6])$/)) {
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
          if (currentDiv.clientHeight > 100 && currentDivHeight < currentDiv.clientHeight) {
            currentDivHeight = currentDiv.clientHeight;
            numOfRows += 1;
          }
          if (numOfRows < desiredNumberOfRows) {
            nextTag.current = tags.shift();
            if (nextTag.current.word === "===") {
              currentDivHeight = 0;
              numOfRows = 0;
              if (currentContent.current.length > 0) {
                slideTags.current = [...slideTags.current, currentContent.current.trim()];
              }
              if (tags.length > 0) {
                createNewDiv(tags);
              }
            } else {
              if (nextTag.current.word === "<br/>") {
                nextTag.current.word = "";
              }
              if (nextTag.current.paragraphStart) {
                // if (method === "custom_file") {
                //   //currentContent.current = currentContent.current.trim();
                //   currentContent.current = currentContent.current.replace(/^[^\S\r]+|[^\S\r]+$/g, '');
                // }
                const lastRIndex = currentContent.current.lastIndexOf('\r');
                if (nextTag.current.word.startsWith("#")||currentContent.current.trim().endsWith(".")||currentContent.current[lastRIndex + 1] === '#') {
                  currentContent.current += "\r";
                }
                
                // if (currentContent.current.startsWith('#')) {
                //   if (currentContent.current.length > 0) {
                //     slideTags.current = [...slideTags.current, currentContent.current.trim()];
                //   }
                //   tags.unshift(nextTag.current);
                //   if (tags.length > 0) {
                //     createNewDiv(tags);
                //   }
                // }
                if (nextTag.current.tagName === "H1") {
                  nextTag.current.word = "### " + nextTag.current.word;
                }
                if (nextTag.current.tagName.match(/^(H[2-6])$/)) {
                  nextTag.current.word = "# " + nextTag.current.word;
                }
              }
              currentContent.current += nextTag.current.word;
              if (method === "custom_file") {
                currentContent.current += " ";
              }
              currentDiv.innerHTML = md.render(currentContent.current);
              if (terminateCondition === tags.length && tags.length === 0 && currentContent.current.length > 0 && currentContent.current !== "\r ") { 
                slideTags.current = [...slideTags.current, currentContent.current.trim()];
                terminateCondition = terminateCondition-1;
              }
            }
          } else {
            currentDivHeight = 0;
            numOfRows = 0;
            for (let i=0;i<4;i++) {
              nextTag.current = tags.shift();
              if (nextTag.current != undefined && nextTag.current.word === "===") {
                break;
              }
              if (nextTag.current != undefined && nextTag.current.word === "<br/>") {
                nextTag.current.word = "";
              }
              if (nextTag.current != undefined && nextTag.current.paragraphStart) {
                // if (method === "custom_file") {
                //   //currentContent.current = currentContent.current.trim();
                //   currentContent.current = currentContent.current.replace(/^[^\S\r]+|[^\S\r]+$/g, '');
                // }
                const lastRIndex = currentContent.current.lastIndexOf('\r');
                if (nextTag.current.word.startsWith("#")||currentContent.current.trim().endsWith(".")||currentContent.current[lastRIndex + 1] === '#') {
                  currentContent.current += "\r";
                }
                if (currentContent.current.startsWith('#')) {
                  tags.unshift(nextTag.current);
                  break;
                }
                if (nextTag.current != undefined && nextTag.current.tagName === "H1") {
                  nextTag.current.word = "### " + nextTag.current.word;
                }
                if (nextTag.current != undefined && nextTag.current.tagName.match(/^(H[2-6])$/)) {
                  nextTag.current.word = "# " + nextTag.current.word;
                }
              }
              if (nextTag.current != undefined){
                currentContent.current += nextTag.current.word;
              }
              if (method === "custom_file") {
                currentContent.current += " ";
              }
              currentDiv.innerHTML = md.render(currentContent.current);
              //if (currentContent.current.trim().endsWith(".")) {
              // currentContent.current = currentContent.current.replace(/^[^\S\r]+|[^\S\r]+$/g, '');
              if (currentContent.current.endsWith(".")) {
                break;
              }
            }
            if (currentContent.current.length > 0) {
              slideTags.current = [...slideTags.current, currentContent.current.trim()];
            }
            if (tags.length > 0) {
              createNewDiv(tags);
            }
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
  }, [tags, visible, updateSplitTags, method]);
  return tags
    ? /*#__PURE__*/ _jsx("div", {
        ref: (el) => (divRefs.current[0] = el),
      })
    : null;
};

export default SlideSplit;
