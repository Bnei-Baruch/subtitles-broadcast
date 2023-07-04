ALTER TABLE books RENAME TO old_books;
alter table old_books add column slides_jsonb JSONB default '{}';

UPDATE old_books 
SET slides_jsonb = slides::jsonb
WHERE slides_jsonb = '{}';

ALTER TABLE bookmarks RENAME TO old_bookmarks;

CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    author VARCHAR(50),
    title VARCHAR(150),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS contents (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books (id),
    page VARCHAR(20),
	letter VARCHAR(20),
	subletter VARCHAR(20),
    page_int INT NULL,
	letter_int INT NULL,
	subletter_int INT NULL,
    revert VARCHAR(20),
    content VARCHAR,
    
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books (id),
    content_id INT REFERENCES contents (id),
    path VARCHAR(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

INSERT INTO books (id, author, title, created_at, updated_at)
SELECT id, author, title, created_at, updated_at
FROM old_books;

INSERT INTO bookmarks (book_id, path, created_at, updated_at, content_id)
SELECT old_books.id, old_bookmarks.book, old_bookmarks.created_at, old_bookmarks.updated_at, c.id
FROM old_books
INNER JOIN old_bookmarks ON old_books.author = old_bookmarks.author AND old_bookmarks.book IS NOT NULL
LEFT JOIN contents c ON old_books.id = c.book_id;

CREATE OR REPLACE FUNCTION parse_slides() RETURNS VOID AS $$
BEGIN
    INSERT INTO contents (book_id, page, letter, subletter, revert, content, created_at, updated_at)
    SELECT
        old_books.id,
        elem->>'page'::text as page,
        elem->>'letter'::text as letter,
        elem->>'subletter'::text as subletter,
        elem->>'revert'::text as revert,
        elem->>'content'::text as content,
        created_at,
        updated_at
    FROM
        old_books,
        jsonb_array_elements(slides_jsonb) AS elem;
END $$ LANGUAGE plpgsql;
SELECT parse_slides();
DROP FUNCTION parse_slides;

CREATE OR REPLACE FUNCTION ConvertHebrewToNumeric(hebrewNumber VARCHAR)
RETURNS INTEGER AS
$$
DECLARE
    numericNumber INTEGER;
BEGIN
    numericNumber := 0;

    -- Map Hebrew numbers to numeric values
    CASE hebrewNumber
        WHEN 'א' THEN numericNumber := 1;
        WHEN 'ב' THEN numericNumber := 2;
        WHEN 'ג' THEN numericNumber := 3;
        WHEN 'ד'    THEN numericNumber := 4;   
        WHEN 'ה'    THEN numericNumber := 5;   
        WHEN 'ו'    THEN numericNumber := 6;   
        WHEN 'ז'    THEN numericNumber := 7;   
        WHEN 'ח'    THEN numericNumber := 8;   
        WHEN 'ט'    THEN numericNumber := 9;   
        WHEN 'י'    THEN numericNumber := 10;  
        WHEN 'יא'   THEN numericNumber := 11;  
        WHEN 'יב'   THEN numericNumber := 12;  
        WHEN 'יג'   THEN numericNumber := 13;  
        WHEN 'יד'   THEN numericNumber := 14;  
        WHEN 'טו'   THEN numericNumber := 15;  
        WHEN 'טז'   THEN numericNumber := 16; 
        WHEN 'יז'   THEN numericNumber := 17;  
        WHEN 'יח'   THEN numericNumber := 18;  
        WHEN 'יט'   THEN numericNumber := 19;  
        WHEN 'כ'    THEN numericNumber := 20;  
        WHEN 'יוד'  THEN numericNumber := 20;
        WHEN 'כא'  THEN numericNumber := 21;  
        WHEN 'כב'  THEN numericNumber := 22;  
        WHEN 'כג'  THEN numericNumber := 23;  
        WHEN 'כד'  THEN numericNumber := 24;  
        WHEN 'כה'  THEN numericNumber := 25;  
        WHEN 'יב-יג'  THEN numericNumber := 25;
        WHEN 'כו'    THEN numericNumber := 26;  
        WHEN 'כז'    THEN numericNumber := 27;  
        WHEN 'כח'   THEN numericNumber := 28;  
        WHEN 'כט'   THEN numericNumber := 29;  
        WHEN 'ל'    THEN numericNumber := 30;  
        WHEN 'לא'   THEN numericNumber := 31;  
        WHEN 'לב'   THEN numericNumber := 32;  
        WHEN 'לג'   THEN numericNumber := 33;  
        WHEN 'לד'   THEN numericNumber := 34;  
        WHEN 'לה'   THEN numericNumber := 35;  
        WHEN 'לו'   THEN numericNumber := 36;  
        WHEN 'לז'   THEN numericNumber := 37;  
        WHEN 'לח'   THEN numericNumber := 38;  
        WHEN 'לט'  THEN numericNumber := 39;  
        WHEN 'מ'   THEN numericNumber := 40;  
        WHEN 'מא'  THEN numericNumber := 41;  
        WHEN 'מב'  THEN numericNumber := 42;  
        WHEN 'מג'  THEN numericNumber := 43;  
        WHEN 'מד'  THEN numericNumber := 44;  
        WHEN 'מה'  THEN numericNumber := 45;  
        WHEN 'מו'  THEN numericNumber := 46;  
        WHEN 'מז'  THEN numericNumber := 47;  
        WHEN 'מח'  THEN numericNumber := 48;  
        WHEN 'מט'  THEN numericNumber := 49;  
        WHEN 'נ'   THEN numericNumber := 50;  
        WHEN 'נא'  THEN numericNumber := 51;  
        WHEN 'נב'  THEN numericNumber := 52;  
        WHEN 'נג'  THEN numericNumber := 53;  
        WHEN 'נד'  THEN numericNumber := 54;  
        WHEN 'נה'  THEN numericNumber := 55;  
        WHEN 'נו'  THEN numericNumber := 56;  
        WHEN 'נז'  THEN numericNumber := 57;  
        WHEN 'נח'  THEN numericNumber := 58;  
        WHEN 'נט'  THEN numericNumber := 59;  
        WHEN 'ס'   THEN numericNumber := 60;  
        WHEN 'סא'  THEN numericNumber := 61;  
        WHEN 'סב'  THEN numericNumber := 62;  
        WHEN 'סג'  THEN numericNumber := 63;  
        WHEN 'סד'  THEN numericNumber := 64;  
        WHEN 'סה'  THEN numericNumber := 65;  
        WHEN 'סו'  THEN numericNumber := 66;  
        WHEN 'סז'  THEN numericNumber := 67;  
        WHEN 'סח'  THEN numericNumber := 68;  
        WHEN 'סט'  THEN numericNumber := 69;  
        WHEN 'ע'   THEN numericNumber := 70;  
        WHEN 'עא'  THEN numericNumber := 71;  
        WHEN 'עב'  THEN numericNumber := 72;  
        WHEN 'עג'  THEN numericNumber := 73;  
        WHEN 'עד'  THEN numericNumber := 74;  
        WHEN 'עה'  THEN numericNumber := 75;  
        WHEN 'עו'  THEN numericNumber := 76;  
        WHEN 'עז'  THEN numericNumber := 77;  
        WHEN 'עח'  THEN numericNumber := 78;  
        WHEN 'עט'  THEN numericNumber := 79;  
        WHEN 'פ'   THEN numericNumber := 80;  
        WHEN 'פא'  THEN numericNumber := 81;  
        WHEN 'פב'  THEN numericNumber := 82;  
        WHEN 'פג'  THEN numericNumber := 83;  
        WHEN 'פד'  THEN numericNumber := 84;  
        WHEN 'פה'  THEN numericNumber := 85;  
        WHEN 'פו'  THEN numericNumber := 86;  
        WHEN 'פז'  THEN numericNumber := 87; 
        WHEN 'פוא' THEN numericNumber := 87; 
        WHEN 'פח'  THEN numericNumber := 88;  
        WHEN 'פוב' THEN numericNumber := 88;
        WHEN 'פזא' THEN numericNumber := 88;
        WHEN 'פט'  THEN numericNumber := 89; 
        WHEN 'פזב' THEN numericNumber := 89;  
        WHEN 'צ'   THEN numericNumber := 90; 
        WHEN 'צא'  THEN numericNumber := 91;  
        WHEN 'צב'  THEN numericNumber := 92;  
        WHEN 'צג'  THEN numericNumber := 93;  
        WHEN 'צד'  THEN numericNumber := 94;  
        WHEN 'צה'  THEN numericNumber := 95;  
        WHEN 'צו'  THEN numericNumber := 96;  
        WHEN 'צז'  THEN numericNumber := 97;  
        WHEN 'צח'  THEN numericNumber := 98;  
        WHEN 'צט'  THEN numericNumber := 99;  
        WHEN 'ק'   THEN numericNumber := 100; 
        WHEN 'קא'  THEN numericNumber := 101; 
        WHEN 'קב'  THEN numericNumber := 102; 
        WHEN 'קג'  THEN numericNumber := 103; 
        WHEN 'קד'  THEN numericNumber := 104; 
        WHEN 'קה'  THEN numericNumber := 105; 
        WHEN 'קו'  THEN numericNumber := 106; 
        WHEN 'קז'  THEN numericNumber := 107; 
        WHEN 'קח'  THEN numericNumber := 108; 
        WHEN 'קט'  THEN numericNumber := 109; 
        WHEN 'קי'  THEN numericNumber := 110; 
        WHEN 'קיא' THEN numericNumber := 111; 
        WHEN 'קיב' THEN numericNumber := 112; 
        WHEN 'קיג' THEN numericNumber := 113; 
        WHEN 'קיד' THEN numericNumber := 114; 
        WHEN 'קטו' THEN numericNumber := 115; 
        WHEN 'קטז' THEN numericNumber := 116; 
        WHEN 'קיז' THEN numericNumber := 117; 
        WHEN 'קיח' THEN numericNumber := 118;
        WHEN 'קיט' THEN numericNumber := 119; 
        WHEN 'קכ' THEN numericNumber := 120;
        WHEN 'קכא' THEN numericNumber := 121; 
        WHEN 'קכב' THEN numericNumber := 122; 
        WHEN 'קכג' THEN numericNumber := 123; 
        WHEN 'קכד' THEN numericNumber := 124; 
        WHEN 'קכה' THEN numericNumber := 125; 
        WHEN 'קכו' THEN numericNumber := 126; 
        WHEN 'קכז' THEN numericNumber := 127; 
        WHEN 'קכח' THEN numericNumber := 128; 
        WHEN 'קכט' THEN numericNumber := 129; 
        WHEN 'קל' THEN numericNumber := 130; 
        WHEN 'יען' THEN numericNumber := 130;
        WHEN 'קלא' THEN numericNumber := 131; 
        WHEN 'קלב' THEN numericNumber := 132; 
        WHEN 'קלג' THEN numericNumber := 133; 
        WHEN 'קלד' THEN numericNumber := 134; 
        WHEN 'קלה' THEN numericNumber := 135; 
        WHEN 'קלו' THEN numericNumber := 136; 
        WHEN 'קלז' THEN numericNumber := 137; 
        WHEN 'קלח' THEN numericNumber := 138; 
        WHEN 'קלט' THEN numericNumber := 139; 
        WHEN 'קמ'  THEN numericNumber := 140; 
        WHEN 'קמא' THEN numericNumber := 141; 
        WHEN 'קמב' THEN numericNumber := 142; 
        WHEN 'קמג' THEN numericNumber := 143; 
        WHEN 'קמד' THEN numericNumber := 144; 
        WHEN 'קמה' THEN numericNumber := 145; 
        WHEN 'קמו' THEN numericNumber := 146; 
        WHEN 'קמז' THEN numericNumber := 147; 
        WHEN 'קמח' THEN numericNumber := 148; 
        WHEN 'קמט' THEN numericNumber := 149; 
        WHEN 'קנ'  THEN numericNumber := 150; 
        WHEN 'קנא' THEN numericNumber := 151; 
        WHEN 'קנב' THEN numericNumber := 152; 
        WHEN 'קנג' THEN numericNumber := 153; 
        WHEN 'קנד' THEN numericNumber := 154;
        WHEN 'קנה' THEN numericNumber := 155; 
        WHEN 'קנו' THEN numericNumber := 156;
        WHEN 'קנז' THEN numericNumber := 157; 
        WHEN 'קנח' THEN numericNumber := 158; 
        WHEN 'קנט' THEN numericNumber := 159; 
        WHEN 'קס'  THEN numericNumber := 160; 
        WHEN 'קסא' THEN numericNumber := 161; 
        WHEN 'קסב' THEN numericNumber := 162; 
        WHEN 'קסג' THEN numericNumber := 163; 
        WHEN 'קסד' THEN numericNumber := 164; 
        WHEN 'קסה' THEN numericNumber := 165; 
        WHEN 'קסו' THEN numericNumber := 166; 
        WHEN 'קסז' THEN numericNumber := 167; 
        WHEN 'קסח' THEN numericNumber := 168; 
        WHEN 'קסט' THEN numericNumber := 169; 
        WHEN 'קע'  THEN numericNumber := 170; 
        WHEN 'קעא' THEN numericNumber := 171; 
        WHEN 'קעב' THEN numericNumber := 172; 
        WHEN 'קעג' THEN numericNumber := 173; 
        WHEN 'קעד' THEN numericNumber := 174; 
        WHEN 'קעה' THEN numericNumber := 175; 
        WHEN 'קעו' THEN numericNumber := 176; 
        WHEN 'קעז' THEN numericNumber := 177; 
        WHEN 'קעח' THEN numericNumber := 178; 
        WHEN 'קעט' THEN numericNumber := 179; 
        WHEN 'קפ'  THEN numericNumber := 180; 
        WHEN 'קפא' THEN numericNumber := 181; 
        WHEN 'קפב' THEN numericNumber := 182; 
        WHEN 'קפג' THEN numericNumber := 183; 
        WHEN 'קפד' THEN numericNumber := 184; 
        WHEN 'קפה' THEN numericNumber := 185; 
        WHEN 'קפו' THEN numericNumber := 186; 
        WHEN 'קפז' THEN numericNumber := 187; 
        WHEN 'קפח' THEN numericNumber := 188; 
        WHEN 'קפט' THEN numericNumber := 189; 
        WHEN 'קצ'  THEN numericNumber := 190; 
        WHEN 'קצא' THEN numericNumber := 191; 
        WHEN 'קצב' THEN numericNumber := 192; 
        WHEN 'קצג' THEN numericNumber := 193; 
        WHEN 'קצה' THEN numericNumber := 194; 
        WHEN 'קצד' THEN numericNumber := 194;
        WHEN 'קצז' THEN numericNumber := 195; 
        WHEN 'קצו' THEN numericNumber := 196;
        WHEN 'קצח' THEN numericNumber := 198; 
        WHEN 'קצט' THEN numericNumber := 199; 
        WHEN 'ר'   THEN numericNumber := 200; 
        WHEN 'רא'  THEN numericNumber := 201; 
        WHEN 'רב'  THEN numericNumber := 202; 
        WHEN 'רג'  THEN numericNumber := 203; 
        WHEN 'רד'  THEN numericNumber := 204; 
        WHEN 'רה'  THEN numericNumber := 205; 
        WHEN 'רו'  THEN numericNumber := 206; 
        WHEN 'רז'  THEN numericNumber := 207; 
        WHEN 'רח'  THEN numericNumber := 208; 
        WHEN 'רט'  THEN numericNumber := 209; 
        WHEN 'רי'  THEN numericNumber := 210; 
        WHEN 'ריא' THEN numericNumber := 211; 
        WHEN 'ריב' THEN numericNumber := 212; 
        WHEN 'ריג' THEN numericNumber := 213; 
        WHEN 'ריד' THEN numericNumber := 214; 
        WHEN 'רטו' THEN numericNumber := 215; 
        WHEN 'רטז' THEN numericNumber := 216; 
        WHEN 'ריז' THEN numericNumber := 217; 
        WHEN 'ריח' THEN numericNumber := 218; 
        WHEN 'ריט' THEN numericNumber := 219; 
        WHEN 'רכ'  THEN numericNumber := 220; 
        WHEN 'רכא' THEN numericNumber := 221; 
        WHEN 'רכב' THEN numericNumber := 222; 
        WHEN 'רכג' THEN numericNumber := 223; 
        WHEN 'רכד' THEN numericNumber := 224; 
        WHEN 'רכה' THEN numericNumber := 225; 
        WHEN 'רכו' THEN numericNumber := 226;
        WHEN 'רכז' THEN numericNumber := 227; 
        WHEN 'רכח' THEN numericNumber := 228;
        WHEN 'רכט' THEN numericNumber := 229; 
        WHEN 'רל'  THEN numericNumber := 230; 
        WHEN 'רלא' THEN numericNumber := 231; 
        WHEN 'רלב' THEN numericNumber := 232; 
        WHEN 'רלג' THEN numericNumber := 233; 
        WHEN 'רלד' THEN numericNumber := 234; 
        WHEN 'רלה' THEN numericNumber := 235; 
        WHEN 'רלו' THEN numericNumber := 236; 
        WHEN 'רלז' THEN numericNumber := 237; 
        WHEN 'רלח' THEN numericNumber := 238; 
        WHEN 'רלט' THEN numericNumber := 239; 
        WHEN 'רמ'  THEN numericNumber := 240; 
        WHEN 'רמא' THEN numericNumber := 241; 
        WHEN 'רמב' THEN numericNumber := 242;
        WHEN 'רמג' THEN numericNumber := 243; 
        WHEN 'רמד' THEN numericNumber := 244;
        WHEN 'רמה' THEN numericNumber := 245; 
        WHEN 'רמו' THEN numericNumber := 246; 
        WHEN 'רמז' THEN numericNumber := 247; 
        WHEN 'רמח' THEN numericNumber := 248; 
        WHEN 'רמט' THEN numericNumber := 249; 
        WHEN 'רנ'  THEN numericNumber := 250; 
        WHEN 'רנא' THEN numericNumber := 251; 
        WHEN 'רנב' THEN numericNumber := 252; 
        WHEN 'רנג' THEN numericNumber := 253; 
        WHEN 'רנד' THEN numericNumber := 254; 
        WHEN 'רנה' THEN numericNumber := 255; 
        WHEN 'רנו' THEN numericNumber := 256;
        WHEN 'רנז' THEN numericNumber := 257; 
        WHEN 'רנח' THEN numericNumber := 258; 
        WHEN 'רנט' THEN numericNumber := 259; 
        WHEN 'רס'  THEN numericNumber := 260; 
        WHEN 'רסא' THEN numericNumber := 261; 
        WHEN 'רסב' THEN numericNumber := 262; 
        WHEN 'רסג' THEN numericNumber := 263; 
        WHEN 'רסד' THEN numericNumber := 264; 
        WHEN 'רסה' THEN numericNumber := 265;
        WHEN 'רסו' THEN numericNumber := 266;
        WHEN 'רסז' THEN numericNumber := 267;
        WHEN 'רסח' THEN numericNumber := 268;
        WHEN 'רסט' THEN numericNumber := 269;
        WHEN 'רע' THEN numericNumber := 270;
        WHEN 'רעא' THEN numericNumber := 271;
        WHEN 'ערב' THEN numericNumber := 272;
        WHEN 'רעב' THEN numericNumber := 272;
        WHEN 'רעג' THEN numericNumber := 273;
        WHEN 'רעד' THEN numericNumber := 274;
        WHEN 'רעה' THEN numericNumber := 275;
        WHEN 'רעו' THEN numericNumber := 276;
        WHEN 'רעז' THEN numericNumber := 277;
        WHEN 'רעח' THEN numericNumber := 278;
        WHEN 'רעט' THEN numericNumber := 279;
        WHEN 'רפ' THEN numericNumber := 280;
        WHEN 'רפא' THEN numericNumber := 281;
        WHEN 'רפב' THEN numericNumber := 282;
        WHEN 'רפג' THEN numericNumber := 283;
        WHEN 'רפד' THEN numericNumber := 284;
        WHEN 'רפה' THEN numericNumber := 285;
        WHEN 'רפו' THEN numericNumber := 286;
        WHEN 'רפז' THEN numericNumber := 287;
        WHEN 'רפח' THEN numericNumber := 288;
        WHEN 'רפט' THEN numericNumber := 289;
        WHEN 'רצ' THEN numericNumber := 290;
        WHEN 'רצא' THEN numericNumber := 291;
        WHEN 'רצב' THEN numericNumber := 292;
        WHEN 'רצג' THEN numericNumber := 293;
        WHEN 'רצד' THEN numericNumber := 294;
        WHEN 'רצה' THEN numericNumber := 295;
        WHEN 'רצו' THEN numericNumber := 296;
        WHEN 'רצז' THEN numericNumber := 297;
        WHEN 'רצח' THEN numericNumber := 298;
        WHEN 'רצט' THEN numericNumber := 299;
        WHEN 'ש' THEN numericNumber := 300;
        WHEN 'שא' THEN numericNumber := 301;
        WHEN 'שב' THEN numericNumber := 302;
        WHEN 'שג' THEN numericNumber := 303;
        WHEN 'שד' THEN numericNumber := 304;
        WHEN 'שה' THEN numericNumber := 305;
        WHEN 'שו' THEN numericNumber := 306;
        WHEN 'שז' THEN numericNumber := 307;
        WHEN 'שח' THEN numericNumber := 308;
        WHEN 'שט' THEN numericNumber := 309;
        WHEN 'שי' THEN numericNumber := 310;
        WHEN 'שיא' THEN numericNumber := 311;
        WHEN 'שיב' THEN numericNumber := 312;
        WHEN 'שיג' THEN numericNumber := 313;
        WHEN 'שיד' THEN numericNumber := 314;
        WHEN 'שטו' THEN numericNumber := 315;
        WHEN 'שטז' THEN numericNumber := 316;
        WHEN 'שיז' THEN numericNumber := 317;
        WHEN 'שיח' THEN numericNumber := 318;
        WHEN 'שיט' THEN numericNumber := 319;
        WHEN 'שכ' THEN numericNumber := 320;
        WHEN 'שכא' THEN numericNumber := 321;
        WHEN 'שכב' THEN numericNumber := 322;
        WHEN 'שכג' THEN numericNumber := 323;
        WHEN 'שכד' THEN numericNumber := 324;
        WHEN 'שכה' THEN numericNumber := 325; 
        WHEN 'שכו' THEN numericNumber := 326; 
        WHEN 'שכז' THEN numericNumber := 327; 
        WHEN 'שכח' THEN numericNumber := 328; 
        WHEN 'שכט' THEN numericNumber := 329;
        WHEN 'של' THEN numericNumber := 330;
        WHEN 'שלא' THEN numericNumber := 331;
        WHEN 'שלב' THEN numericNumber := 332;
        WHEN 'שלג' THEN numericNumber := 333;
        WHEN 'שלד' THEN numericNumber := 334;
        WHEN 'שלה' THEN numericNumber := 335;
        WHEN 'שלו' THEN numericNumber := 336;
        WHEN 'שלז' THEN numericNumber := 337;
        WHEN 'שלח' THEN numericNumber := 338;
        WHEN 'שלט' THEN numericNumber := 339;
        WHEN 'שמ' THEN numericNumber := 340;
        WHEN 'שמא' THEN numericNumber := 341;
        WHEN 'שמב' THEN numericNumber := 342;
        WHEN 'שמג' THEN numericNumber := 343;
        WHEN 'שמד' THEN numericNumber := 344;
        WHEN 'שמה' THEN numericNumber := 345;
        WHEN 'שמו' THEN numericNumber := 346;
        WHEN 'שמז' THEN numericNumber := 347;
        WHEN 'שמח' THEN numericNumber := 348;
        WHEN 'שמט' THEN numericNumber := 349;
        WHEN 'שנ' THEN numericNumber := 350;
        WHEN 'שנא' THEN numericNumber := 351;
        WHEN 'שנב' THEN numericNumber := 352;
        WHEN 'שנג' THEN numericNumber := 353;
        WHEN 'שנד' THEN numericNumber := 354;
        WHEN 'שנה' THEN numericNumber := 355;
        WHEN 'שנו' THEN numericNumber := 356;
        WHEN 'שנז' THEN numericNumber := 357;
        WHEN 'שנח' THEN numericNumber := 358;
        WHEN 'שנט' THEN numericNumber := 359;
        WHEN 'שס' THEN numericNumber := 360;
        WHEN 'שסא' THEN numericNumber := 361;
        WHEN 'שסב' THEN numericNumber := 362;
        WHEN 'ת' THEN numericNumber := 400;
        WHEN 'תכה' THEN numericNumber := 425;
        WHEN 'רכט-רל' THEN numericNumber := 459;
        WHEN 'ר-ש' THEN numericNumber := 500;
        WHEN 'תקז' THEN numericNumber := 507;
        WHEN 'רסג-רסד' THEN numericNumber := 527;
        WHEN 'שבחינת' THEN numericNumber := 770;
        WHEN 'בראשית' THEN numericNumber := 913;
        WHEN 'YYYח' THEN numericNumber := 1208;
        -- WHEN 'יב/ב' THEN numericNumber := 14;
        -- WHEN 'כ'' THEN numericNumber :=  20;
        -- WHEN 'לג/ב'  THEN numericNumber := 35;
        -- WHEN 'לח/ב' THEN numericNumber := 40;
        -- WHEN 'מז/ב' THEN numericNumber := 49;
        -- WHEN 'קכה/ב' THEN numericNumber := 127;
        -- WHEN 'קלא/ב' THEN numericNumber := 133;
        ELSE numericNumber := CAST(hebrewNumber AS INTEGER); -- Return the numeric value of the input if no match found
    END CASE;

    RETURN numericNumber;
END;
$$
LANGUAGE plpgsql;
UPDATE contents 
SET 
page_int = ConvertHebrewToNumeric(page),
--letter_int = ConvertHebrewToNumeric(letter),
subletter_int = ConvertHebrewToNumeric(subletter);
DROP FUNCTION ConvertHebrewToNumeric;

--UPDATE contents
--SET content = regexp_replace(content, '<[^>]+>', '', 'g');

CREATE INDEX idx_contents_book_id ON contents(book_id);
CREATE INDEX idx_books_title ON books(title);
