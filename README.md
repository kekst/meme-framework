# LITERAL MEME FRAMEWORK

## wtf?

```tsx
/** @jsxImportSource meme-framework */
import { render, MemeFramework } from "meme-framework";
import { writeFileSync } from "fs";
import { loadImage, Image, Canvas } from "canvas";

interface Props {
  image: Image | Canvas;
  topText?: string;
  bottomText?: string;
}

export function Caption({ image, topText, bottomText }: Props) {
  const textStyles: MemeFramework.Style = {
    fontFamily: "Impact",
    maxFontSize: "90px",
    minFontSize: "42px",
    textColor: "white",
    stroke: {
      color: "black",
      width: 8,
    },
    shadow: {
      color: "rgba(0,0,0,0.3)",
      x: 4,
      y: 4,
      blur: 8,
    },
    textAlign: "center",
    marginLeft: "20px",
    marginRight: "20px",
  };

  return (
    <vstack style={{ width: "700px", backgroundColor: "black" }}>
      <image source={image} id="image" />
      <text
        style={{
          position: {
            type: "absolute",
            top: "2%",
          },
          ...textStyles,
        }}
      >
        {topText}
      </text>
      <text
        style={{
          position: {
            type: "absolute",
            bottom: "2%",
          },
          ...textStyles,
        }}
      >
        {bottomText}
      </text>
    </vstack>
  );
}

async function mkmeme() {
  const image = await loadImage(
    "https://imgflip.com/s/meme/Ancient-Aliens.jpg"
  );
  const canvas = await render(
    <Caption
      image={image}
      topText={"LOL LOL LOL LOL"}
      bottomText="god im so 😊 funny"
    />
  );
  const buffer = canvas.toBuffer("image/png");
  writeFileSync("./image.png", buffer);
}

mkmeme();
```

## features

- automatic text scaling
- proper layouting, u can make any meme template u want
- supports regular emojis (renders them with apple emoji pngs cuz theyre funny)
- supports discord emojis (just pass them as `<:whatever:3425203985235>` or smth)
