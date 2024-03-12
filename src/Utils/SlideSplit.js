
import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
import markdownit from 'markdown-it';

const SlideSplit = ({
  tags,
  visible,
//  updateSplitTags
}) => {
  const index = useRef(0);
  //const slideTags = useRef([]);
  const desiredContainerHeight = 310;
  const divIdPrefix = "slide";
  const divRefs = useRef([]);
  const currentTag = useRef(null);
  const nextTag = useRef(null);
  const currentContent = useRef('');
  const previousParagraphStartsWithIntent = useRef('');
  const md = markdownit({html:true});
  const regex = /^[\d+)|\d+.|*]/;

  useEffect(() => {
    const createNewDiv = tagList => {
      const newDiv = document.createElement('div');
      newDiv.className = divIdPrefix + ' slide-content';
      newDiv.id = divIdPrefix + '_' + index.current;
      newDiv.style.height = 'unset';
      newDiv.style.minHeight = '310px';
      newDiv.style.position = 'relative';
      newDiv.style.outline = 'solid';
      newDiv.style.transform = 'scale(0.5)';
      newDiv.style.transformOrigin = 'top left';
      if (!visible) {
        newDiv.style.position = 'absolute';
        newDiv.style.visibility = 'hidden';
      }
      nextTag.current = tagList.shift();
      currentTag.current = document.createElement(nextTag.current.tagName);
      currentContent.current = currentTag.current.textContent;
      if (nextTag.current.tagName == "H1") {
        nextTag.current.word = "# " + nextTag.current.word
      } else {
        // If the starting word continues the previous indented content then put indent
        var first = nextTag.current.word.charAt(0);
        if (regex.test(previousParagraphStartsWithIntent.current)) {
            if (first === first.toLowerCase() && first !== first.toUpperCase() || previousParagraphStartsWithIntent.current.slice(-1) != "."){
                nextTag.current.word = "<ul>" + nextTag.current.word;
            }
        }
      }
      currentTag.current.textContent += nextTag.current.word;
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
          if (nextTag.current.paragraphStart) {
            // close <ul> to finish paragraph indentation
            if (currentTag.current.textContent.includes("<ul>")) {
              currentTag.current.textContent += "</ul>";
            }
            currentTag.current.textContent += "\n\n";
            if (nextTag.current.tagName == "H1") {
              nextTag.current.word = "# " + nextTag.current.word
            }   
          }
          currentContent.current = currentTag.current.textContent;
          currentTag.current.textContent += nextTag.current.word;
          currentDiv.innerHTML = md.render(currentTag.current.textContent)
        } else {
          // If the height limit is reached, create a new div
          currentTag.current.textContent = currentContent.current;
          let slideContentArrary = currentTag.current.textContent.split("\n\n");
          previousParagraphStartsWithIntent.current = slideContentArrary[slideContentArrary.length - 1];;
          currentDiv.innerHTML = md.render(currentTag.current.textContent)
          tags.unshift(nextTag.current);
          createNewDiv(tags);
        }
      }
    };

    // Initial creation of divs
    if (tags && tags.length > 0) {
      console.log(tags.length);
      console.log(tags);
      createNewDiv(tags);
    }
    // set splited slide tags
    // divRefs.current.forEach((div, idx) => {
    //     if (!Array.isArray(slideTags.current[idx])) {
    //       slideTags.current[idx] = [];
    //     }
    //     slideTags.current[idx].push(div.innerHTML);
    // });
    // updateSplitTags(slideTags.current);
    // remove rendered divs
    // if (divRefs.current.length > 1) {
    //   divRefs.current.forEach(div => {
    //     div.remove();
    //   });
    // }
  }, [tags, visible]); //updateSplitTags]);
  return tags ? /*#__PURE__*/_jsx("div", {
    ref: el => divRefs.current[0] = el
  }) : null;
};

export default SlideSplit;
