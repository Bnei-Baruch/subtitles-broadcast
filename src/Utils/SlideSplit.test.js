import {
  TOKEN_BOLD,
  TOKEN_H1,
  TOKEN_H2,
  TOKEN_H3,
  TOKEN_ITALIC,
  TOKEN_NEWLINE,
  TOKEN_SEPARATOR,
  TOKEN_TEXT,
  Tokenize,
  createMarkdownit,
  IsTextTokenEnumeration,
  sourceToMarkdown,
  split,
  createNewDiv,
  MARE_MAKOM_PATTERN,
} from "./SlideSplit";

test('Markdown only two endlines to <p>', () => {
  const md = createMarkdownit();
  expect(md.render('test\none\nor\n\ntwo endlines')).toBe('<p>test\none\nor</p>\n<p>two endlines</p>\n');
});

test('Tokenize, sanity check', () => {
  const testText = 'token is good';
  expect(Tokenize([], 0, testText)).toStrictEqual({token: {text: 'token', type: TOKEN_TEXT, stack: []}, restIndex: 5});
  expect(Tokenize([], 5, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: []}, restIndex: 6});
  expect(Tokenize([], 6, testText)).toStrictEqual({token: {text: 'is', type: TOKEN_TEXT, stack: []}, restIndex: 8});
  expect(Tokenize([], 8, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: []}, restIndex: 9});
  expect(Tokenize([], 9, testText)).toStrictEqual({token: {text: 'good', type: TOKEN_TEXT, stack: []}, restIndex: 13});
  expect(testText.length).toBe(13);
});

test('Tokenize, markdown simple headers', () => {
  const testText = 'token is good\r# this is header\rNot header\r# # strange header\r\r';
  expect(Tokenize([], 0, testText)).toStrictEqual({token: {text: 'token', type: TOKEN_TEXT, stack: []}, restIndex: 5});
  expect(Tokenize([], 5, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: []}, restIndex: 6});
  expect(Tokenize([], 6, testText)).toStrictEqual({token: {text: 'is', type: TOKEN_TEXT, stack: []}, restIndex: 8});
  expect(Tokenize([], 8, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: []}, restIndex: 9});
  expect(Tokenize([], 9, testText)).toStrictEqual({token: {text: 'good', type: TOKEN_TEXT, stack: []}, restIndex: 13});
  expect(Tokenize([], 13, testText)).toStrictEqual({token: {text: '\r', type: TOKEN_NEWLINE, stack: []}, restIndex: 14});
  expect(Tokenize([], 14, testText)).toStrictEqual({token: {text: '# ', type: TOKEN_H3, stack: [TOKEN_H3]}, restIndex: 16});
  expect(Tokenize([TOKEN_H3], 16, testText)).toStrictEqual({token: {text: 'this', type: TOKEN_TEXT, stack: [TOKEN_H3]}, restIndex: 20});
  expect(Tokenize([TOKEN_H3], 20, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: [TOKEN_H3]}, restIndex: 21});
  expect(Tokenize([TOKEN_H3], 21, testText)).toStrictEqual({token: {text: 'is', type: TOKEN_TEXT, stack: [TOKEN_H3]}, restIndex: 23});
  expect(Tokenize([TOKEN_H3], 23, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: [TOKEN_H3]}, restIndex: 24});
  expect(Tokenize([TOKEN_H3], 24, testText)).toStrictEqual({token: {text: 'header', type: TOKEN_TEXT, stack: [TOKEN_H3]}, restIndex: 30});
  expect(Tokenize([TOKEN_H3], 30, testText)).toStrictEqual({token: {text: '\r', type: TOKEN_NEWLINE, stack: []}, restIndex: 31});
  expect(Tokenize([], 31, testText)).toStrictEqual({token: {text: 'Not', type: TOKEN_TEXT, stack: []}, restIndex: 34});
  expect(Tokenize([], 34, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: []}, restIndex: 35});
  expect(Tokenize([], 35, testText)).toStrictEqual({token: {text: 'header', type: TOKEN_TEXT, stack: []}, restIndex: 41});
  expect(Tokenize([], 41, testText)).toStrictEqual({token: {text: '\r', type: TOKEN_NEWLINE, stack: []}, restIndex: 42});
  expect(Tokenize([], 42, testText)).toStrictEqual({token: {text: '# ', type: TOKEN_H3, stack: [TOKEN_H3]}, restIndex: 44});
  // Strange case where the stack will not go further when using "many" headers...
  expect(Tokenize([TOKEN_H3], 44, testText)).toStrictEqual({token: {text: '# ', type: TOKEN_H3, stack: [TOKEN_H3]}, restIndex: 46});
  expect(Tokenize([TOKEN_H3], 46, testText)).toStrictEqual({token: {text: 'strange', type: TOKEN_TEXT, stack: [TOKEN_H3]}, restIndex: 53});
  expect(Tokenize([TOKEN_H3], 53, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: [TOKEN_H3]}, restIndex: 54});
  expect(Tokenize([TOKEN_H3], 54, testText)).toStrictEqual({token: {text: 'header', type: TOKEN_TEXT, stack: [TOKEN_H3]}, restIndex: 60});
  expect(Tokenize([TOKEN_H3], 60, testText)).toStrictEqual({token: {text: '\r', type: TOKEN_NEWLINE, stack: []}, restIndex: 61});
  expect(Tokenize([TOKEN_H3], 61, testText)).toStrictEqual({token: {text: '\r', type: TOKEN_NEWLINE, stack: []}, restIndex: 62});
  expect(testText.length).toBe(62);
});

test('Tokenize, markdown combined', () => {
  const testText = 'test\r# merged *italic **and bold**\rmarkdown*';
  expect(Tokenize([], 0, testText)).toStrictEqual({token: {text: 'test', type: TOKEN_TEXT, stack: []}, restIndex: 4});
  expect(Tokenize([], 4, testText)).toStrictEqual({token: {text: '\r', type: TOKEN_NEWLINE, stack: []}, restIndex: 5});
  expect(Tokenize([], 5, testText)).toStrictEqual({token: {text: '# ', type: TOKEN_H3, stack: [TOKEN_H3]}, restIndex: 7});
  expect(Tokenize([TOKEN_H3], 7, testText)).toStrictEqual({token: {text: 'merged', type: TOKEN_TEXT, stack: [TOKEN_H3]}, restIndex: 13});
  expect(Tokenize([TOKEN_H3], 13, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: [TOKEN_H3]}, restIndex: 14});
  expect(Tokenize([TOKEN_H3], 14, testText)).toStrictEqual({token: {text: '*', type: TOKEN_ITALIC, stack: [TOKEN_H3, TOKEN_ITALIC]}, restIndex: 15});
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC], 15, testText)).toStrictEqual({token: {text: 'italic', type: TOKEN_TEXT, stack: [TOKEN_H3, TOKEN_ITALIC]}, restIndex: 21});
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC], 21, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: [TOKEN_H3, TOKEN_ITALIC]}, restIndex: 22});
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC], 22, testText)).toStrictEqual({token: {text: '**', type: TOKEN_BOLD, stack: [TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD]}, restIndex: 24});
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD], 24, testText)).toStrictEqual({token: {text: 'and', type: TOKEN_TEXT, stack: [TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD]}, restIndex: 27});
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD], 27, testText)).toStrictEqual({token: {text: ' ', type: TOKEN_SEPARATOR, stack: [TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD]}, restIndex: 28});
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD], 28, testText)).toStrictEqual({token: {text: 'bold', type: TOKEN_TEXT, stack: [TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD]}, restIndex: 32});
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC, TOKEN_BOLD], 32, testText)).toStrictEqual({token: {text: '**', type: TOKEN_BOLD, stack: [TOKEN_H3, TOKEN_ITALIC]}, restIndex: 34});
  // Endline ends potential Italic.
  expect(Tokenize([TOKEN_H3, TOKEN_ITALIC], 34, testText)).toStrictEqual({token: {text: '\r', type: TOKEN_NEWLINE, stack: []}, restIndex: 35});
  expect(Tokenize([], 35, testText)).toStrictEqual({token: {text: 'markdown', type: TOKEN_TEXT, stack: []}, restIndex: 43});
  expect(Tokenize([], 43, testText)).toStrictEqual({token: {text: '*', type: TOKEN_ITALIC, stack: [TOKEN_ITALIC]}, restIndex: 44});
  expect(testText.length).toBe(44);
});

test('Enumaration', () => {
  expect(IsTextTokenEnumeration({text: '1', type: TOKEN_TEXT})).toBe(false);
  expect(IsTextTokenEnumeration({text: '1.', type: TOKEN_TEXT})).toBe(true);
  expect(IsTextTokenEnumeration({text: '1.', type: TOKEN_H1})).toBe(false);
  expect(IsTextTokenEnumeration({text: '1\.', type: TOKEN_TEXT})).toBe(true);
  expect(IsTextTokenEnumeration({text: '1\\.', type: TOKEN_TEXT})).toBe(true);
  expect(IsTextTokenEnumeration({text: '1\\\.', type: TOKEN_TEXT})).toBe(true);
  expect(IsTextTokenEnumeration({text: '1\\\\.', type: TOKEN_TEXT})).toBe(false);
});

test('sourceToMarkdown', () => {
  expect(sourceToMarkdown('<h1>Header</h1>')).toBe('### Header');
  expect(sourceToMarkdown('<p>Content</p>')).toBe('Content');
  let lines = [
    '<h1>Header</h1>',
    '<p>Content</p>',
  ];
  let expected = [
    '### Header',
    'Content'
  ];
  expect(sourceToMarkdown(lines.join('\n'))).toBe(expected.join('\n'));
  lines = [
    '<p>content</p>',
    '<p>(source)</p>',
  ];
  expected = [
    'content',
    '',
    '---',
    '*(source)*',
  ]
  expect(sourceToMarkdown(lines.join('\n'))).toBe(expected.join('\n'));
});

// ============= Split tests ============= //
// We need to simulate rendering for the split to actually work as intended,
// so we will count characters for a line and return new line every LINE_SIZE
// characters. This should be enough to emulate rendering to allow testing
// split algorithm.
const LINE_SIZE = 40;
const LINE_HEIGHT = 70;

const createNextDiv = (visible, index) => {
  const div = createNewDiv(visible, index);
  Object.defineProperty(div, "clientHeight", {
    get() {
      let height = 0;
      if (this.innerHTML) {
        height = LINE_HEIGHT * Math.floor(this.innerHTML.length/LINE_SIZE);
      }
      return height;
    },
  });

  return div;
};

test('split basic', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  let markdown = [
    'one two',
    'three four',
  ].join('\n');
  const result = split(md, divRef, markdown, /*visible=*/ false, createNextDiv);
  expect(result).toEqual(['one two\rthree four']);

  const veryLongSimpleString = 'repeat '.repeat(30);
  const firstSlide = 'repeat '.repeat(27).trim();
  const secondSlide = 'repeat '.repeat(3).trim();
  expect(split(md, divRef, veryLongSimpleString, /*visible=*/ false, createNextDiv)).toEqual([firstSlide, secondSlide]);
});

test('split format new slide', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  let veryLongSimpleString = `*${'repeat '.repeat(30)}*`
  let firstSlide = `*${'repeat '.repeat(26).trim()}*`;
  let secondSlide = `*${'repeat '.repeat(4).trim()} *`;
  expect(split(md, divRef, veryLongSimpleString, /*visible=*/ false, createNextDiv)).toEqual([firstSlide, secondSlide]);

  veryLongSimpleString = `**${'repeat '.repeat(30)}**`
  firstSlide = `**${'repeat '.repeat(25).trim()}**`;
  secondSlide = `**${'repeat '.repeat(5).trim()} **`;
  expect(split(md, divRef, veryLongSimpleString, /*visible=*/ false, createNextDiv)).toEqual([firstSlide, secondSlide]);
});

test('split format', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  const markdown = 'some *format* text';
  expect(split(md, divRef, markdown, /*visible=*/ false, createNextDiv)).toEqual(['some *format* text']);
});

test('split format new slide', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  const markdown = 'some *for\n===\rmat* text';
  expect(split(md, divRef, markdown, /*visible=*/ false, createNextDiv)).toEqual([
    'some *for',
    'mat* text'
  ]);
});

test('split slide', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  const markdown = 'some\n===\ntext';
  expect(split(md, divRef, markdown, /*visible=*/ false, createNextDiv)).toEqual(['some', 'text']);
});

test('split \r', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  const markdown = 'some\ntext';
  expect(split(md, divRef, markdown, /*visible=*/ false, createNextDiv)).toEqual(['some\rtext']);
});

const expectSlide = (reference, slide, expected) => {
  slide = slide.replaceAll('\r', '\n');
  expected = expected.replaceAll('\r', '\n');
  if (slide !== expected) {
    console.log(reference);
    const l = Math.min(slide.length, expected.length);
    for (let i = 0; i <  l; ++i) {
      if (slide[i] !== expected[i]) {
        console.log(`[${slide.slice(Math.max(0, i - 40), i)}]`);
        console.log(i, slide[i].charCodeAt(0), expected[i].charCodeAt(0));
        console.log('actual', `[${slide[i]}]`, `[${slide.slice(i + 1, i + 20)}]`);
        console.log('expected', `[${expected[i]}]`, `[${expected.slice(i + 1, i + 20)}]`);
        break;
      }
    }
  }
  expect(slide).toEqual(expected);
}

test('split source author', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  const markdown = 
    'some text title or anything\nanother interesting title\n\n\n1. ' +
    'No dought that we can do something but we cannot and we ' + 
    'try.\n\n(Shamati A B C )\n\n2. Next one is also text one ' +
    'two three.\nSome more text\n(some regular paranthesis?) and ' +
    'more text\nmore text (now paranthesis)\nsome more ' +
    'text\n(mare makom)\n3. Third passage\n(final mare makom)';

  expect(!!MARE_MAKOM_PATTERN.test(markdown)).toBe(false);
  expect(!!MARE_MAKOM_PATTERN.test('3. Third passage\n(final mare makom)')).toBe(false);
  expect(!!MARE_MAKOM_PATTERN.test(' Third passage\n(final mare makom)')).toBe(false);
  expect(!!MARE_MAKOM_PATTERN.test('Third passage\n(final mare makom)')).toBe(false);
  expect(!!MARE_MAKOM_PATTERN.test(' passage\n(final mare makom)')).toBe(false);
  expect(!!MARE_MAKOM_PATTERN.test('\n(final mare makom)')).toBe(false);
  expect(!!MARE_MAKOM_PATTERN.test('(final mare makom)')).toBe(true);

  const result = split(md, divRef, markdown, false, createNextDiv);
  console.log(result);
  expect(result.length).toEqual(4);
  expectSlide('result 0', result[0], 'some text title or anything\ranother interesting title\r\r');
  expectSlide('result 1', result[1], '1. No dought that we can do something but we cannot and we try.\r\r---\r*(Shamati A B C )*');
  expectSlide('result 2', result[2], '2. Next one is also text one two three.\rSome more text\r' +
    '(some regular paranthesis?) and more text\rmore text (now paranthesis)\rsome more text\r---\r*(mare makom)*');
  expectSlide('result 3', result[3], '3. Third passage\n---\n*(final mare makom)*');
});

test('split legacy', () => {
  const md = createMarkdownit();
  const divRef = document.createElement("div");

  const markdown = `
%author Lesson 6-May 2025-World Kabbalah Convention-Connecting to There Is None Else Besides Him
%book Lesson 6-May 2025-World Kabbalah Convention-Connecting to There Is None Else Besides Him
%break
%H World Kabbalah Convention-Connecting to There Is None Else Besides Him
%break
%H Lesson 6: A Prayer of Many to Reveal the One
%break
%letter 1
1. The Zohar. It advises those people with an inner 
demand, who cannot accept the state they are in because 
they do not see any progress in the work of God, 
%break
and believe what is written (Deuteronomy 30:20), "To love 
the Lord your God, to listen to His voice, and to cleave 
unto Him; for this is your life, and the length of your days."
%break
%S ( PABASH, Article No. 15 (1986), "A Prayer of Many")
%break
%letter 8
8. We ask the Creator to give us the strength so we can 
perform all our actions for You, meaning for the sake of 
the Creator. 
%break
Otherwise, meaning if You do not help us, all our actions 
will be only for our own benefit. That is, "If not," meaning 
"If You do not help us, all our actions will be only for 
ourselves, for our own benefit, 
%break
for we are powerless to overcome our will to receive. 
Therefore, help us be able to work for You. Hence, You 
must help us." This is called "Do for Your sake," 
%break
meaning do this, give us the power of the desire to 
bestow. Otherwise, we are doomed; we will remain in 
the will to receive for our own sake.
%S ( RABASH, Article No. 5 (1991), "What Is, 'The Good Deeds of the Righteous Are the Generations,' in the Work?")`;
  const slides = split(md, divRef, markdown, false, createNextDiv);
  expect(slides.length).toBe(15);
  expectSlide('slide 0', slides[0], '## Lesson 6-May 2025-World Kabbalah Convention-Connecting to There Is None Else Besides Him');
  expectSlide('slide 1', slides[1], '## Lesson 6-May 2025-World Kabbalah Convention-Connecting to There Is None Else Besides Him');
  expectSlide('slide 2', slides[2], '## World Kabbalah Convention-Connecting to There Is None Else Besides Him');
  expectSlide('slide 3', slides[3], '## Lesson 6: A Prayer of Many to Reveal the One');
  expectSlide('slide 4', slides[4], '');
  expectSlide('slide 5', slides[5], '1. The Zohar. It advises those people with an inner \rdemand, who cannot accept the state they are in because \rthey do not see any progress in the work of God,');
  expectSlide('slide 5', slides[5], '1. The Zohar. It advises those people with an inner \rdemand, who cannot accept the state they are in because \rthey do not see any progress in the work of God,');
  expectSlide('slide 6', slides[6], 'and believe what is written (Deuteronomy 30:20), "To love \rthe Lord your God, to listen to His voice, and to cleave \runto Him; for this is your life, and the length of your days."');
  expectSlide('slide 7', slides[7], '---\r*( PABASH, Article No. 15 (1986), "A Prayer of Many")*');
  expectSlide('slide 8', slides[8], '');
  expectSlide('slide 9', slides[9], '8. We ask the Creator to give us the strength so we can \rperform all our actions for You, meaning for the sake of \rthe Creator.');
  expectSlide('slide 10', slides[10], 
    'Otherwise, meaning if You do not help us, all our actions \r' +
    'will be only for our own benefit. That is, "If not," meaning \r' +
    '"If You do not help us, all our actions will be only for \r' +
    'ourselves,');
  expectSlide('slide 11', slides[11], 'for our own benefit,');
  expectSlide('slide 12', slides[12], 
    'for we are powerless to overcome our will to receive. \r' +
    'Therefore, help us be able to work for You. Hence, You \r' +
    'must help us." This is called "Do for Your sake,"');
  expectSlide('slide 13', slides[13], 'meaning do this, give us the power of the desire to \r' +
    'bestow. Otherwise, we are doomed; we will remain in \r' +
    'the will to receive for our own sake.\r---\r*( RABASH, Article No.');
  expectSlide('slide 14', slides[14], '5 (1991), "What Is, \'The Good Deeds of the Righteous Are the Generations,\' in the Work?")*');
});

