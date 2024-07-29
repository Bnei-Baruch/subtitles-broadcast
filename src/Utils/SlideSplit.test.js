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
} from "./SlideSplit";

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
