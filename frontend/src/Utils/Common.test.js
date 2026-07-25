import { isNonLatinScript, isSameLanguagePair } from "./Common";

describe("isNonLatinScript", () => {
  it("detects Hebrew, Arabic and Cyrillic", () => {
    expect(isNonLatinScript("שיר חדש")).toBe(true);
    expect(isNonLatinScript("أغنية")).toBe(true);
    expect(isNonLatinScript("песня")).toBe(true);
  });

  it("is false for Latin script and empty lines", () => {
    expect(isNonLatinScript("Shir Chadash")).toBe(false);
    expect(isNonLatinScript("")).toBe(false);
  });
});

describe("isSameLanguagePair (karaoke secondary-line styling)", () => {
  it("Hebrew + Hebrew is a same-language pair", () => {
    expect(isSameLanguagePair("שורה ראשונה", "שורה שנייה")).toBe(true);
  });

  it("Latin + Latin is a same-language pair", () => {
    expect(isSameLanguagePair("First line", "Second line")).toBe(true);
  });

  it("Hebrew + transliteration is not a same-language pair", () => {
    expect(isSameLanguagePair("שורה ראשונה", "Shura rishona")).toBe(false);
    expect(isSameLanguagePair("Shura rishona", "שורה ראשונה")).toBe(false);
  });
});
