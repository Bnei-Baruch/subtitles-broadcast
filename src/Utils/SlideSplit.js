import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect } from "react";
import markdownit from "markdown-it";
import TurndownService from 'turndown';

export const sourceToMarkdown = (simpleHtml) => {
  const turndownService = new TurndownService();
  turndownService.addRule('h1', {
    filter: 'h1',
    replacement: function (content) {
      return '### ' + content.trim() + "\n";
    }
  });

  turndownService.addRule('h2', {
    filter: 'h2',
    replacement: function (content) {
      return '### ' + content.trim() + "\n";
    }
  });

  turndownService.addRule('h3', {
    filter: 'h3',
    replacement: function (content) {
      return '## ' + content.trim() + "\n";
    }
  });

  turndownService.addRule('h4', {
    filter: 'h4',
    replacement: function (content) {
      return '## ' + content.trim() + "\n";
    }
  });

  turndownService.addRule('h5', {
    filter: 'h5',
    replacement: function (content) {
      return '# ' + content.trim() + "\n";
    }
  });

  turndownService.addRule('h6', {
    filter: 'h6',
    replacement: function (content) {
      return '# ' + content.trim() + "\n";
    }
  });

  turndownService.addRule('hr', {
    filter: 'hr',
    replacement: function (content) {
      return '--- ' + content.trim() + "\n";
    }
  });

  turndownService.addRule('paragraph', {
    filter: 'p',
    replacement: function (content) {
      return content.trim() + "\n";
    }
  });

  turndownService.addRule('em', {
    filter: 'em',
    replacement: function (content) {
      return '*' + content.trim() + '*';
    }
  });

  const convertedMarkdown = turndownService.turndown(simpleHtml);
  // console.log('sourceToMarkdown in', simpleHtml);
  // console.log('sourceToMarkdown out', convertedMarkdown);
  return convertedMarkdown;
};

const createNewDiv = (visible, index) => {
  const newDiv = document.createElement("div");
  const divIdPrefix = "slide";
  newDiv.className = divIdPrefix + " slide-content";
  newDiv.id = divIdPrefix + "_" + index;
  newDiv.style.height = "unset";
  newDiv.style.position = "relative";
  newDiv.style.outline = "solid";
  newDiv.style.transform = "scale(0.5)";
  newDiv.style.transformOrigin = "top left";
  if (!visible) {
    newDiv.style.position = "absolute";
    newDiv.style.visibility = "hidden";
  }
  return newDiv;
}

// Tokenize constants
const SEPARATOR = ' ';
const NEW_LINE = ['\n', '\r'];
const ITALIC = '*';

export const TOKEN_SEPARATOR = 'separator';
export const TOKEN_NEWLINE = 'newline';
export const TOKEN_NEWSLIDE = 'newslide';
export const TOKEN_TEXT = 'text';

// Markdown token types.
export const TOKEN_H1 = 'H1';
export const TOKEN_H2 = 'H2';
export const TOKEN_H3 = 'H3';
export const TOKEN_ITALIC = 'italic';
export const TOKEN_BOLD = 'bold';

const HEADER_TOKENS = [TOKEN_H1, TOKEN_H2, TOKEN_H3]
const MARKDOWN_TOKENS = [...HEADER_TOKENS, TOKEN_ITALIC, TOKEN_BOLD];
const OPEN_CLOSE_TOKENS = [TOKEN_ITALIC, TOKEN_BOLD];

const TokenTypeToText = (type) => {
  if (type === TOKEN_H1) {
    return '### ';
  }
  if (type === TOKEN_H2) {
    return '## ';
  }
  if (type === TOKEN_H3) {
    return '# ';
  }
  if (type === TOKEN_ITALIC) {
    return '*';
  }
  if (type === TOKEN_BOLD) {
    return '**';
  }
  // Should not happen.
  return '';
}

// Identify special markdowns to add "word" to them.
const TokenTextToType = (text) => {
  if (text === '###') {
    return TOKEN_H1;
  }
  if (text === '##') {
    return TOKEN_H2;
  }
  if (text === '#') {
    return TOKEN_H3;
  }
  if (text === '*') {
    return TOKEN_ITALIC;
  }
  if (text === '**') {
    return TOKEN_BOLD;
  }
  return TOKEN_TEXT;
}

const TextOrMarkdownToken = (stack, index, i, text) => {
  // console.log('TextOrMarkdownToken', stack, index, i);
  let tokenText = text.slice(index, i);
  let tokenType = TokenTextToType(tokenText);
  let restIndex = i;
  // Lookahead for headers to make sure we have separator.
  if (HEADER_TOKENS.includes(tokenType) && i < text.length && text[i] === SEPARATOR) {
    tokenText += SEPARATOR;
    restIndex += 1;
  } else if (tokenType === TOKEN_ITALIC && i < text.length && text[i] === ITALIC) {
    // Check for bold.
    tokenType = TOKEN_BOLD;
    tokenText += ITALIC;
    restIndex += 1;
  }
  let newStack = stack;
  let isHeader = HEADER_TOKENS.includes(tokenType);
  if (!isHeader && tokenType !== TOKEN_TEXT && stack.includes(tokenType)) {
    // Remove bold / italic if we see second token.
    newStack = stack.filter(t => t !== tokenType);
  } else if (isHeader) {
    // Don't add duplicate headers, assume first one.
    if (!stack.includes(tokenType)) {
      newStack = [...stack, tokenType];
    }
  } else if (tokenType !== TOKEN_TEXT) {
    newStack = [...stack, tokenType];
  }
  return {
    token: {
      type: tokenType,
      text: tokenText,
      stack: newStack ,
    },
    restIndex,
  };
};

const ENUM_RE = /^\d+\.$/;
const IsTextTokenEnumeration = ({type, text}) => {
  if (type !== TOKEN_TEXT) {
    return false;
  }
  return !!text.match(ENUM_RE);
};

// Stack is a stack of markdown tokens that span over a line or several lines.
// Example: # this is *italic* header.  So when toknizing 'italic', the stack
// will be [TOKEN_H1, TOKEN_ITALIC]
export const Tokenize = (stack, index, text) => {
  for (let i = index; i < text.length; i++) {
    // console.log('loop', i, text[i]);
    const is3Eq = text.slice(i, i+3) === '===';
    if (NEW_LINE.includes(text[i]) || text[i] === SEPARATOR || text[i] === ITALIC || is3Eq) {
      if (i === index) {
        if (text[i] === SEPARATOR) {
          return {token: {type: TOKEN_SEPARATOR, text: ' ', stack}, restIndex: i+1};
        } else if (is3Eq) {
          return { token: { type: TOKEN_NEWSLIDE, text: '', stack: stack.filter(t => !HEADER_TOKENS.includes(t)) }, restIndex: i+3 };
        } else if (NEW_LINE.includes(text[i])) {
          return {
            token: {
              type: TOKEN_NEWLINE,
              text: '\r',  // Convert \n to \r if needed as \n is ignored by markdown as newline.
              stack: [], // New line breaks all markdowns. stack.filter(t => !HEADER_TOKENS.includes(t)),
            },
            restIndex: i+1,
          };
        } else {
          // Italic
          i += 1;
        }
      }
      // Italic, Bold, Text, Header.
      return TextOrMarkdownToken(stack, index, i, text);
    }
  }
  return TextOrMarkdownToken(stack, index, text.length, text);
}

const CutNonVisibleEndings = (slideText) => {
  let from = 0;
  for (; from < slideText.length; from++) {
    if (![SEPARATOR, ...NEW_LINE].includes(slideText[from])) {
      break;
    }
  }
  for (let to = slideText.length - 1; to >= 0; to--) {
    if ([SEPARATOR, '#', ...NEW_LINE].includes(slideText[to])) {
      continue;
    }
    return slideText.slice(from, to+1);
  }
  return '';
}

export const SplitToSlides = ({markdown, updateSlides, active = false, visible = false}) => {
  const divRef = useRef(null);
  const md = markdownit({ html: true }).disable(['lheading']);;
  // console.log('markdown', markdown);

  useEffect(() => {
    if (divRef && markdown && active) {
      divRef.innerHTML = '';
      let {token, restIndex} = Tokenize([], 0, markdown);
      let {type, text, stack} = token;
      let prevToken = null;
      let prevRestIndex = null;
      let nextDivMarkdown = '';
      let divIndex = 0;
      let nextDiv = createNewDiv(visible, divIndex);
      divRef.current.appendChild(nextDiv);
      const slides = [];
      let firstTokenInSlide = true;
      let lines = 0;
      let prevHeight = 0;
      const newSlide = (lastToken) => {
        if (visible) {
          divIndex += 1;
          nextDiv.innerHTML = md.render(nextDivMarkdown); // Just for visualization...
          nextDiv = createNewDiv(visible, divIndex);
          divRef.current.appendChild(nextDiv);
        } else {
          // Reuse one div.
          nextDiv.innerHTML = '';
        }
        slides.push(CutNonVisibleEndings(nextDivMarkdown) +
          // Add ending token for Italic/Bold.
          lastToken.stack.slice().filter(t => !HEADER_TOKENS.includes(t) && t !== lastToken.type)
              .reverse().map(t =>TokenTypeToText(t)).join(''));
        nextDivMarkdown = '';
        firstTokenInSlide = true;
        lines = 0;
        prevHeight = 0;
      };
      while (!prevRestIndex || prevRestIndex <= markdown.length &&
             (!prevToken || (prevToken.text || prevToken.type === TOKEN_NEWSLIDE))) {
        /*console.log('while', JSON.stringify(nextDivMarkdown));
        console.log('lines', lines);
        console.log(restIndex, markdown.length);
        console.log(nextDiv.clientHeight, firstTokenInSlide);
        console.log(prevToken, token);
        console.log(JSON.stringify(markdown.slice(restIndex, restIndex+30)));*/
        if (IsTextTokenEnumeration(token) ||
            type === TOKEN_NEWSLIDE ||
            (HEADER_TOKENS.includes(type) && CutNonVisibleEndings(nextDivMarkdown) !== '')) {
          // New slide due to enumeration, header or new slide token.
          newSlide(token);
          prevToken = token;
          prevRestIndex = restIndex;
          ({token, restIndex} = Tokenize(stack, restIndex, markdown));
          ({type, text, stack} = token);
        } else if (nextDiv.clientHeight < 310) {
          if (firstTokenInSlide) {
            if (prevToken) {
              prevToken.stack
                .filter(tokenType => tokenType !== prevToken.type)
                .forEach(tokenType => nextDivMarkdown += TokenTypeToText(tokenType));
            }
            firstTokenInSlide = false;
          }
          // Count lines.
          if (prevHeight !== nextDiv.clientHeight && nextDiv.clientHeight - prevHeight > 30) {
            lines += 1;
            prevHeight = nextDiv.clientHeight;
          }
          nextDivMarkdown += prevToken ? prevToken.text : '';
          // Cut on . and , if last line.
          if (lines === 4 && [',', '.'].includes(prevToken.text[prevToken.text.length - 1])) {
            newSlide(prevToken);

            prevToken = token;
            prevRestIndex = restIndex;
            ({token, restIndex} = Tokenize(stack, restIndex, markdown));
            ({type, text, stack} = token);
          } else {
            nextDiv.innerHTML = md.render(nextDivMarkdown + text + 
              // We want to add potential closing markdown tokens.
              (!OPEN_CLOSE_TOKENS.includes(type) ?
                stack.slice().filter(t => !HEADER_TOKENS.includes(t)).reverse().map(t =>TokenTypeToText(t)).join('')
                : ''));

            prevToken = token;
            prevRestIndex = restIndex;
            ({token, restIndex} = Tokenize(stack, restIndex, markdown));
            ({type, text, stack} = token);
          }
        } else {
          newSlide(prevToken);
        }
      }
      // Add last token
      if (prevToken) {
        nextDivMarkdown += prevToken.text;
      }
      slides.push(CutNonVisibleEndings(nextDivMarkdown));
      // console.log(slides);
      updateSlides(slides);
    }
  }, [divRef, active, markdown, visible, updateSlides]);

  return (
    <>
      <div ref={divRef}></div>
    </>
  );
};
