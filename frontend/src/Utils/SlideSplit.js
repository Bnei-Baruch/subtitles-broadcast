import { useMemo, useRef, useEffect } from "react";
import markdownit from "markdown-it";
import TurndownService from 'turndown';

export const createMarkdownit = () => {
  return markdownit({ html: true, breaks: false }).disable(['lheading', 'list']);
}

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
      const trim = content.trim();
      if (trim.match(/^\(([^()]+)\)$/)) {
        return `---\n*${trim}*\n\n`;
      }
      return '=== ' + trim + "\n";
    }
  });

  turndownService.addRule('em', {
    filter: 'em',
    replacement: function (content) {
      return '*' + content.trim() + '*';
    }
  });
  
  turndownService.addRule('strong', {
    filter: 'strong',
    replacement: function (content) {
      return ' **' + content.trim() + '** ';
    }
  });

  const convertedMarkdown = turndownService.turndown(simpleHtml);
  return convertedMarkdown;
};

export const createNewDiv = (visible, index) => {
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
export const TOKEN_SKIP = 'skip';

// Markdown token types.
export const TOKEN_H1 = 'H1';
export const TOKEN_H2 = 'H2';
export const TOKEN_H3 = 'H3';
export const TOKEN_ITALIC = 'italic';
export const TOKEN_BOLD = 'bold';

const HEADER_TOKENS = [TOKEN_H1, TOKEN_H2, TOKEN_H3]
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
const WHITE_SPACES_REGEXP = /^\s+$/;
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
  if (NEW_LINE.includes(text))  {
    return TOKEN_NEWLINE;
  }
  if (WHITE_SPACES_REGEXP.test(text)) {
    return TOKEN_SEPARATOR;
  }
  return TOKEN_TEXT;
}

const fixLegacyTokens = (text, index, i) => {
  const tokenText = text.slice(index, i);
  let restIndex = i;
  if (tokenText.startsWith('%page') || tokenText.startsWith('%letter')) {
    restIndex = i;
    while(restIndex < text.length) {
      if (NEW_LINE.includes(text[restIndex])) {
        break;
      }
      restIndex++;
    }
    return {tokenText: ' ', restIndex};
  }
  if (tokenText.startsWith('%S')) {
    return {tokenText: ' ', restIndex};
  }
  if (tokenText.startsWith('%')) {
    return {tokenText: '##', restIndex};
  }
  return {tokenText, restIndex};
};

const TextOrMarkdownToken = (stack, index, i, text) => {
  let {tokenText, restIndex} = fixLegacyTokens(text, index, i);
  let tokenType = TokenTextToType(tokenText);
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
  } else if (![TOKEN_TEXT, TOKEN_SEPARATOR].includes(tokenType)) {
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

const ENUM_RE = /^[\dאבגדהוזחטיכלמנסעפצקרשתםןץףך]+\\?[.)]$/;
export const IsTextTokenEnumeration = ({type, text}) => {
  if (type !== TOKEN_TEXT) {
    return false;
  }
  return !!text.match(ENUM_RE);
};

// |stack| is a stack of markdown tokens that span over a line or several lines.
// Example: # this is *italic* header. So when toknizing 'italic', the stack
// will be [TOKEN_H1, TOKEN_ITALIC]
export const Tokenize = (stack, index, text) => {
  for (let i = index; i < text.length; i++) {
    // breakLength of -1 for no break, otherwise the length of the break token.
    const breakLength = (text.slice(i, i+3) === '===' && 3) || (text.slice(i, i+6) === '%break' && 6) || -1;
    if (NEW_LINE.includes(text[i]) || text[i] === SEPARATOR || text[i] === ITALIC || breakLength !== -1) {
      if (i === index) {
        if (text[i] === SEPARATOR) {
          return {token: {type: TOKEN_SEPARATOR, text: ' ', stack}, restIndex: i+1};
        } else if (breakLength !== -1) {
          return { token: { type: TOKEN_NEWSLIDE, text: '', stack: stack.filter(t => !HEADER_TOKENS.includes(t)) }, restIndex: i+breakLength };
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
      // Italic, Bold, Text, Header, Legacy skips.
      return TextOrMarkdownToken(stack, index, i, text);
    }
  }
  return TextOrMarkdownToken(stack, index, text.length, text);
};

// Cuts spaces from head and tail also considering new lines.
// Will eventually also cut spaces after ** at start and before
// ** at end.
export const CutNonVisibleEndings = (slideText) => {
  let from = 0;
  let newLinesStart = 0;
  for (; from < slideText.length; from++) {
    if (![SEPARATOR, ...NEW_LINE].includes(slideText[from])) {
      break;
    }
    if (NEW_LINE.includes(slideText[from])) {
      newLinesStart++;
    }
  }
  let newLinesEnd = 0;
  for (let to = slideText.length - 1; to >= 0; to--) {
    if (NEW_LINE.includes(slideText[to])) {
      newLinesEnd++;
    }
    if ([SEPARATOR, '#', ...NEW_LINE].includes(slideText[to])) {
      continue;
    }
    return (newLinesStart >= 2 ? '\r\r' : '') +
      slideText.slice(from, to+1).replace(/(^\*\*)\s+/, '$1').replace(/\s+(\*\*)$/, '$1') +
      (newLinesEnd >= 2 ? '\r\r' : '');
  }
  return '';
};

class TokensManipulator {
  onToken(prevToken, token, restIndex, prevRestIndex, markdown) {
    throw new Error('Unimplemented');
  }
};

export const MARE_MAKOM_PATTERN = /^(?: |%S)*\([^\n\r]*\)(?: |%S)*($|\n|\r|%break)/;

class MareMakomManipulator extends TokensManipulator {
  constructor() {
    super();
    this.matched = false;
    this.skipSeparators = false;
  }

  onToken(prevToken, token, restIndex, prevRestIndex, markdown) {
    const rest = ((token && token.text) ? token.text + ' ' : '') + markdown.slice(restIndex);
    if (!this.matched) {
      if (prevToken && prevToken.type === TOKEN_NEWLINE && MARE_MAKOM_PATTERN.test(rest)) {
        this.matched = true;
        this.skipSeparators = !token.text.startsWith('(');
        const mareMakomToken = {type: TOKEN_TEXT, text: '---\r*', stack: token.stack};
        return {token: mareMakomToken, restIndex: prevRestIndex};
      }
    } else {
      if (token && token.type === TOKEN_TEXT && token.text.startsWith('(')) {
        this.skipSeparators = false;
      } else if ((token && (token.type === TOKEN_NEWLINE)) || (prevToken.text === '' && restIndex === markdown.length)) {
        this.matched = false;
        const stopMatchToken = {type: TOKEN_TEXT, text: '*', stack: token.stack};
        return {token: stopMatchToken, restIndex: prevRestIndex};
      }
      if (this.skipSeparators && token.type === TOKEN_SEPARATOR) {
        token.type = TOKEN_SKIP;
      }
    }
    return {token, restIndex};
  }
};

export const split = (md, divRef, markdown, visible, createNextDiv) => {
  const MANIPULATORS = [
    new MareMakomManipulator(),
  ];
  divRef.innerHTML = '';
  let {token, restIndex} = Tokenize([], 0, markdown);
  let {type, text, stack} = token;
  let prevToken = null;
  let prevRestIndex = null;
  let nextDivMarkdown = '';
  let divIndex = 0;
  let nextDiv = createNextDiv(visible, divIndex);
  divRef?.current?.appendChild(nextDiv);
  const slides = [];
  let firstTokenInSlide = true;
  let lines = 0;
  let wordsInLine = 0;
  let prevHeight = 0;

  // Store backtrack point for proper last line cutoff.
  let lastLineCutoffs = [];

  const newSlide = (lastToken, token, restIndex) => {
    if (token !== null && lastLineCutoffs.length > 0) {
      lastLineCutoffs.sort((a, b) => b.score - a.score);  // Higher score first.

      const cutoff = lastLineCutoffs[0];
      token = cutoff.token;
      lastToken = cutoff.lastToken;
      restIndex = cutoff.restIndex;
      nextDivMarkdown = cutoff.nextDivMarkdown;
      prevRestIndex = cutoff.lastRestIndex;
    }

    if (visible) {
      divIndex += 1;
      nextDiv.innerHTML = md.render(nextDivMarkdown); // Just for visualization...
      nextDiv = createNextDiv(visible, divIndex);
      divRef.current.appendChild(nextDiv);
    } else {
      // Reuse one div.
      nextDiv.innerHTML = '';
    }
    slides.push(CutNonVisibleEndings(nextDivMarkdown) +
      // Add ending token for Italic/Bold.
      lastToken.stack.slice().filter(t => !HEADER_TOKENS.includes(t) && t !== lastToken.type)
          .reverse().map(t => TokenTypeToText(t)).join(''));
    nextDivMarkdown = '';
    firstTokenInSlide = true;
    lines = 0;
    wordsInLine = 0;
    prevHeight = 0;
    lastLineCutoffs = [];

    console.log('NEW SLIDE', lastToken, token, restIndex, prevRestIndex);
    return {prevToken: lastToken, token, restIndex, prevRestIndex};
  };

  while (((token && (token.text || type === TOKEN_NEWSLIDE)) || (prevToken && prevToken.text))) {
    if ((prevToken && prevToken.type === TOKEN_NEWLINE && IsTextTokenEnumeration(token)) ||
        type === TOKEN_NEWSLIDE ||
        (HEADER_TOKENS.includes(type) && CutNonVisibleEndings(nextDivMarkdown) !== '')) {
      // New slide due to /*enumeration*/, header or new slide token.
      newSlide(token, null, null);
      prevToken = token;
      prevRestIndex = restIndex;
      ({token, restIndex} = Tokenize(stack, restIndex, markdown));
      for (const m of MANIPULATORS) {
        ({token, restIndex} = m.onToken(prevToken, token, restIndex, prevRestIndex, markdown));
      }
      ({type, text, stack} = token);
      wordsInLine++;
    } else if (nextDiv.clientHeight < 310) {
      if (firstTokenInSlide) {
        if (prevToken) {
          for (const tokenType of prevToken.stack) {
            if (tokenType !== prevToken.type) {
              nextDivMarkdown += TokenTypeToText(tokenType);
            }
          }
        }
        firstTokenInSlide = false;
      }
      // Count lines.
      if (prevHeight !== nextDiv.clientHeight && nextDiv.clientHeight - prevHeight > 30) {
        lines += 1;
        wordsInLine = 0;
        prevHeight = nextDiv.clientHeight;
      }
      nextDivMarkdown += (prevToken && prevToken.type !== TOKEN_SKIP) ? prevToken.text : '';
      // Cut on . and , if last line.
      const lastChar = (prevToken && prevToken.type !== TOKEN_SKIP && prevToken.text[prevToken.text.length - 1]) || '';
      if ([3,4].includes(lines) && [',', '.'].includes(lastChar)) {
        const nextToken = Tokenize(stack, restIndex, markdown);
        lastLineCutoffs.push({
          // Sort the cutoffs, dots more important then commas,
          // last more important then first.
          score: lastChar === ',' ? (lines * 100 + wordsInLine) : (lines * 1000 + wordsInLine),
          lastToken: token,
          lastRestIndex: restIndex,
          token: nextToken.token,
          restIndex: nextToken.restIndex,
          nextDivMarkdown
        });
      } else if (prevToken && prevToken.type === TOKEN_NEWLINE) {
        lastLineCutoffs = [];
      }
      nextDiv.innerHTML = md.render(nextDivMarkdown + (type === TOKEN_SKIP ? '' : text) + 
        // We want to add potential closing markdown tokens.
        (!OPEN_CLOSE_TOKENS.includes(type) ?
          stack.slice().filter(t => !HEADER_TOKENS.includes(t)).reverse().map(t =>TokenTypeToText(t)).join('')
          : ''));

      prevToken = token;
      prevRestIndex = restIndex;
      ({token, restIndex} = Tokenize(stack, restIndex, markdown));
      for (const m of MANIPULATORS) {
        ({token, restIndex} = m.onToken(prevToken, token, restIndex, prevRestIndex, markdown));
      }
      ({type, text, stack} = token);
      wordsInLine++;
    } else {
      ({token, prevToken, restIndex, prevRestIndex} = newSlide(prevToken, token, restIndex));
    }
  }
  // Add last token
  if (prevToken && prevToken.type !== TOKEN_SKIP) {
    nextDivMarkdown += prevToken.text;
  }
  slides.push(CutNonVisibleEndings(nextDivMarkdown));
  return slides;
};

export const SplitToSlides = ({markdown, updateSlides, active = false, visible = false}) => {
  const divRef = useRef(null);
  const md = useMemo(() => createMarkdownit(), []);

  useEffect(() => {
    if (divRef && markdown && active) {
      updateSlides(split(md, divRef, markdown, visible, createNewDiv));
    }
  }, [divRef, md, active, markdown, visible, updateSlides]);

  return (
    <>
      <div ref={divRef}></div>
    </>
  );
};
