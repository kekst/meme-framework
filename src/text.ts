import { CanvasRenderingContext2D, Image, loadImage } from "canvas";
import { parse, EmojiEntity } from "./emoji";

const cachedEmojiImages = new Map<string, Image>();

async function loadEmojiImageByUrl(url: string) {
  if (cachedEmojiImages.has(url)) {
    return cachedEmojiImages.get(url);
  }

  const image = await loadImage(url);
  cachedEmojiImages.set(url, image);

  return image;
}

const DISCORD_EMOJI_PATTERN = /<a?:\w+:(\d{17,19})>/g;
const DISCORD_EMOJI_PATTERN_SINGLE = /<a?:\w+:(\d{17,19})>/;
const EMOJI_REPLACEMENT_CHAR = "‱";
const EMOJI_SIDE_MARGIN = 0.1;

export function fixLine(str: string) {
  return str.trim().replace(/\s{2,}/g, " ");
}

export function getLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (maxWidth < 10) {
    throw new Error("getLines: invalid max width");
  }

  let lines: string[] = [];
  let emojis = text.matchAll(DISCORD_EMOJI_PATTERN);
  let textLines = text
    .replace(DISCORD_EMOJI_PATTERN, EMOJI_REPLACEMENT_CHAR)
    .split("\n");

  for (const textLine of textLines) {
    let line = "";
    let words = textLine.split(" ");

    for (let word of words) {
      word = fixLine(word);
      if (!word) {
        continue;
      }

      if (textWidth(ctx, word) > maxWidth) {
        lines.push(line);
        line = "";

        let width = 0;
        let i = 0;
        let l = 1;

        while (i + l < word.length) {
          while (width < maxWidth && i + l < word.length) {
            width = textWidth(ctx, word.substring(i, i + l - 1));
            l++;
          }

          if (i + l >= word.length) {
            lines.push(word.substring(i, i + l));
          } else {
            lines.push(word.substring(i, i + l - 1));
          }
          i += l - 1;
          l = 1;
          width = 0;
        }
        continue;
      }

      const testLine = fixLine(line + " " + word);

      if (textWidth(ctx, testLine) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }

    lines.push(line);
  }

  if (emojis) {
    let text = lines.join("\n");
    for (const emoji of emojis) {
      text = text.replace(EMOJI_REPLACEMENT_CHAR, `\u200b${emoji[0]}\u200b`);
    }
    lines = text.split("\n");
  }

  return lines.map((line) => fixLine(line)).filter((line) => !!line);
}

type Entity = string | { url: string };

function parseDiscordEmojis(textEntities: Entity[]) {
  const newTextEntities: Entity[] = [];

  for (const entity of textEntities) {
    if (typeof entity === "string") {
      for (const word of entity.split("\u200b")) {
        const match = word.match(DISCORD_EMOJI_PATTERN_SINGLE);
        newTextEntities.push(
          match
            ? { url: `https://cdn.discordapp.com/emojis/${match[1]}.png` }
            : word
        );
      }
    } else {
      newTextEntities.push(entity);
    }
  }

  return newTextEntities;
}

function splitEntitiesFromText(text: string) {
  const emojiEntities: EmojiEntity[] = parse(text);

  let unparsedText = text;
  let lastEmojiIndice = 0;
  const textEntities: Entity[] = [];

  emojiEntities.forEach((emoji) => {
    textEntities.push(
      unparsedText.slice(0, emoji.indices[0] - lastEmojiIndice)
    );

    textEntities.push(emoji);

    unparsedText = unparsedText.slice(emoji.indices[1] - lastEmojiIndice);
    lastEmojiIndice = emoji.indices[1];
  });

  textEntities.push(unparsedText);

  return parseDiscordEmojis(textEntities);
}

export function getAbsoluteFontSize(ctx: CanvasRenderingContext2D) {
  const fontMetrics = ctx.measureText("HELLO WORLD");
  return (
    fontMetrics.actualBoundingBoxAscent + fontMetrics.actualBoundingBoxDescent
  );
}

export function getLineHeight(ctx: CanvasRenderingContext2D) {
  return 1.5 * getAbsoluteFontSize(ctx);
}

export function getEmojiSize(ctx: CanvasRenderingContext2D) {
  return Math.round(getLineHeight(ctx));
}

export function getBaseline(ctx: CanvasRenderingContext2D): number {
  const fontMetrics = ctx.measureText("HELLO WORLD");
  return (fontMetrics as any).alphabeticBaseline;
}

export function textWidth(
  context: CanvasRenderingContext2D,
  text: string
): number {
  const textEntities = splitEntitiesFromText(text);
  const emojiSize = getEmojiSize(context);

  const emojiSideMargin = emojiSize * EMOJI_SIDE_MARGIN;

  let currentWidth = 0;

  for (let i = 0; i < textEntities.length; i++) {
    const entity = textEntities[i];
    if (typeof entity === "string") {
      currentWidth += context.measureText(entity).width;
    } else {
      currentWidth += emojiSize + emojiSideMargin * 2;
    }
  }

  return currentWidth;
}

export async function drawTextWithEmoji(
  context: CanvasRenderingContext2D,
  fillType: "fill" | "stroke",
  text: string,
  x: number,
  y: number,
  drawWidth: number,
  textAlign?: CanvasTextAlign
) {
  const textEntities = splitEntitiesFromText(text);
  const emojiSize = getEmojiSize(context);

  const emojiSideMargin = emojiSize * EMOJI_SIDE_MARGIN;
  context.textBaseline = "top";

  const width = textWidth(context, text);

  //text align
  let textLeftMargin = 0;

  context.textAlign = "left";

  switch (textAlign) {
    case "center":
      textLeftMargin = drawWidth / 2 - width / 2;
      break;
    case "end":
    case "right":
      textLeftMargin = drawWidth - width;
      break;
  }

  let currentWidth = 0;

  for (let i = 0; i < textEntities.length; i++) {
    const entity = textEntities[i];
    if (typeof entity === "string") {
      if (fillType === "fill") {
        context.fillText(entity, textLeftMargin + x + currentWidth, y);
      } else {
        context.strokeText(entity, textLeftMargin + x + currentWidth, y);
      }

      currentWidth += context.measureText(entity).width;
    } else {
      try {
        const emoji = await loadEmojiImageByUrl(entity.url);
        if (!emoji) {
          continue;
        }

        const emojiHeight = Math.round(
          (emojiSize / emoji.width) * emoji.height
        );
        const offsetY = Math.max(0, Math.round((emojiSize - emojiHeight) / 2));

        context.drawImage(
          emoji,
          textLeftMargin + x + currentWidth + emojiSideMargin,
          y + offsetY,
          emojiSize,
          emojiHeight
        );
      } catch {}

      currentWidth += emojiSize + emojiSideMargin * 2;
    }
  }

  if (textAlign) {
    context.textAlign = textAlign;
  }
}
