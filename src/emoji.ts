import emojiRegex from "emoji-regex";
import path from "path";

const dataSource = require.resolve("emoji-datasource-apple");
const emojiDir = path.join(path.dirname(dataSource), "img", "apple", "64");
const emoji: EmojiData[] = require("emoji-datasource-apple");

export interface EmojiEntity {
  type: string;
  text: string;
  url: string;
  indices: number[];
}

interface EmojiData {
  name: string;
  unified: string;
  non_qualified?: string;
  has_img_apple: boolean;
  image: string;
  skin_variations?: Record<
    string,
    { unified: string; has_img_apple: boolean; image: string }
  >;
}

export const TypeName = "emoji";

export function parse(text: string): EmojiEntity[] {
  const entities: EmojiEntity[] = [];

  const regex = emojiRegex();
  regex.lastIndex = 0;
  while (true) {
    const result = regex.exec(text);
    if (!result) {
      break;
    }

    const emojiText = result[0];
    const codepoints = toCodePoints(removeVS16s(emojiText)).map((code) =>
      code.toUpperCase()
    );
    let skin: string | undefined = undefined;
    while (codepoints.length > 0) {
      const joined = codepoints.join("-");
      const search = emoji.find(
        (data) => data.unified === joined || data.non_qualified === joined
      );

      if (search?.has_img_apple) {
        const skinVar = skin ? search.skin_variations?.[skin] : undefined;
        const image = skinVar?.has_img_apple ? skinVar.image : search.image;
        entities.push({
          url: path.join(emojiDir, image),
          indices: [result.index, regex.lastIndex],
          text: emojiText,
          type: TypeName,
        });
        break;
      }

      skin = codepoints.pop();
    }
  }

  return entities;
}

const vs16RegExp = /\uFE0F/g;
// avoid using a string literal like '\u200D' here because minifiers expand it inline
const zeroWidthJoiner = String.fromCharCode(0x200d);

const removeVS16s = (rawEmoji: string) =>
  rawEmoji.indexOf(zeroWidthJoiner) < 0
    ? rawEmoji.replace(vs16RegExp, "")
    : rawEmoji;

export function toCodePoints(unicodeSurrogates: string): string[] {
  const points = [];
  let char = 0;
  let previous = 0;
  let i = 0;
  while (i < unicodeSurrogates.length) {
    char = unicodeSurrogates.charCodeAt(i++);
    if (previous) {
      points.push(
        (0x10000 + ((previous - 0xd800) << 10) + (char - 0xdc00)).toString(16)
      );
      previous = 0;
    } else if (char > 0xd800 && char <= 0xdbff) {
      previous = char;
    } else {
      points.push(char.toString(16));
    }
  }
  return points;
}
