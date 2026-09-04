/* Convert an .otf/.ttf to the typeface.js JSON format Three's FontLoader expects.
   Three parses glyph.o by splitting on spaces into lowercase commands:
   m x y | l x y | q cpx cpy x y | b cpx1 cpy1 cpx2 cpy2 x y   (Y is up)
   Usage: node scripts/convert-font.mjs <input.otf> <output.json> */
import opentype from "opentype.js";
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node scripts/convert-font.mjs <input.otf> <output.json>");
  process.exit(1);
}

const buffer = readFileSync(input);
const font = opentype.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
);
const upm = font.unitsPerEm;

const round = (n) => Math.round(n * 100) / 100;

/** Serialize opentype path commands into typeface.js outline tokens. */
function toOutline(commands) {
  const tokens = [];
  for (const c of commands) {
    switch (c.type) {
      case "M":
        tokens.push("m", round(c.x), round(-c.y));
        break;
      case "L":
        tokens.push("l", round(c.x), round(-c.y));
        break;
      case "Q":
        tokens.push("q", round(c.x1), round(-c.y1), round(c.x), round(-c.y));
        break;
      case "C":
        tokens.push(
          "b",
          round(c.x1), round(-c.y1),
          round(c.x2), round(-c.y2),
          round(c.x), round(-c.y)
        );
        break;
      case "Z":
        break; // Three closes subpaths implicitly
    }
  }
  return tokens.join(" ");
}

const glyphs = {};
const glyphSet = font.glyphs;
for (let i = 0; i < glyphSet.length; i++) {
  const glyph = glyphSet.get(i);
  if (!glyph || glyph.unicode === undefined) continue;
  const char = String.fromCodePoint(glyph.unicode);
  const path = glyph.getPath(0, 0, upm);
  glyphs[char] = {
    ha: glyph.advanceWidth ?? upm,
    x_min: glyph.xMin ?? 0,
    x_max: glyph.xMax ?? 0,
    o: toOutline(path.commands),
  };
}

const names = font.names || {};
const typeface = {
  familyName: names.fontFamily?.en ?? "Brotheric",
  cssFontWeight: "normal",
  cssFontStyle: "normal",
  ascender: font.ascender,
  descender: font.descender,
  underlinePosition: font.tables?.post?.underlinePosition ?? -100,
  underlineThickness: font.tables?.post?.underlineThickness ?? 50,
  boundingBox: {
    xMin: font.tables?.head?.xMin ?? 0,
    xMax: font.tables?.head?.xMax ?? 0,
    yMin: font.tables?.head?.yMin ?? 0,
    yMax: font.tables?.head?.yMax ?? 0,
  },
  resolution: 1000,
  original_font_information: names,
  glyphs,
};

writeFileSync(output, JSON.stringify(typeface));
console.log(`Wrote ${Object.keys(glyphs).length} glyphs -> ${output}`);
