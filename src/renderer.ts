import { Canvas, CanvasRenderingContext2D, Image } from "canvas";
import { Fragment } from "./jsx-runtime";
import { MemeFramework } from "./types";
import { drawTextWithEmoji, getLineHeight, getLines } from "./text";

interface LayoutingContext {
  x: number;
  y: number;
  px: number;
  py: number;
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  elementById: Record<string, MemeFramework.MemeNode>;
}

interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
  drawWidth: number;
  drawHeight: number;
  absolute?: boolean;
}

interface LayoutNode {
  node: MemeFramework.MemeNode;
  layout: Layout;
  children?: LayoutNode[];
  textContents?: string;
}

const defaultFontFamily = "Arial";
const defaultFontSize = "12px";

function getSize(unit: string | undefined, max: number): number {
  if (!unit) {
    return 0;
  }

  const value = parseFloat(unit);
  if (!value) {
    return 0;
  }

  const type = unit.replace(/[^a-z%]/gi, "");
  switch (type) {
    case "px":
      return value;
    case "%":
      return (value / 100) * max;
  }

  return 0;
}

function getFont(style?: MemeFramework.Style) {
  const fontSize = style?.fontSize || defaultFontSize;
  const fontStyle = style?.fontStyle || "";
  const fontFamily = style?.fontFamily || defaultFontFamily;
  return `${fontStyle} ${fontSize} "${fontFamily}", ${fontSize} "${defaultFontFamily}"`;
}

function computeTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string | undefined,
  style: MemeFramework.Style | undefined,
  maxWidth: number
): number {
  if (!text) {
    return 0;
  }

  if (style && style.minFontSize && style.maxFontSize) {
    style.fontSize = style.minFontSize;
    ctx.font = getFont(style);
    let lines = getLines(ctx, text, maxWidth);
    const lineCount = lines.length;
    if (lineCount === 0) {
      return 0;
    }

    //max and min in px, not accurate but fuck it
    const minMeasure = ctx.measureText("HELLO WORLD");
    style.fontSize = style.maxFontSize;
    ctx.font = getFont(style);
    const maxMeasure = ctx.measureText("HELLO WORLD");

    //find max
    let current = minMeasure.actualBoundingBoxAscent;
    while (
      lines.length === lineCount &&
      current < maxMeasure.actualBoundingBoxAscent
    ) {
      style.fontSize = `${current}px`;
      ctx.font = getFont(style);
      lines = getLines(ctx, text, maxWidth);
      current++;
    }

    //max is --
    current--;
    style.fontSize = `${current}px`;
    ctx.font = getFont(style);
    lines = getLines(ctx, text, maxWidth);
    return lines.length * getLineHeight(ctx);
  } else {
    ctx.font = getFont(style);
    const lines = getLines(ctx, text, maxWidth);
    return lines.length * getLineHeight(ctx);
  }
}

function getNodeTextContents(node: MemeFramework.MemeNode): string | undefined {
  if (typeof node === "string") {
    return node;
  }

  const children = node?.props?.children;
  if (typeof children === "string") {
    return children;
  } else if (Array.isArray(children)) {
    return children
      .filter(
        (child) =>
          typeof child === "string" ||
          typeof child === "number" ||
          typeof child === "boolean" ||
          typeof child === "bigint"
      )
      .map((child) => child?.toString())
      .join("");
  }

  return undefined;
}

function performLayout(
  node: MemeFramework.MemeNode,
  context: LayoutingContext,
  ctx: CanvasRenderingContext2D
): LayoutNode | undefined {
  if (!node) {
    return undefined;
  }

  const layout: Layout = {
    width: 0,
    height: 0,
    drawWidth: 0,
    drawHeight: 0,
    ...context,
  };

  if (typeof node === "object") {
    const realMaxWidth = context.maxWidth || context.width || 0;
    const realMaxHeight = context.maxHeight || context.height || 0;
    let maxWidth = realMaxWidth;
    let maxHeight = realMaxHeight;
    const style = node.props?.style;
    const position = style?.position;
    const childrenProp = node.props?.children;
    const nodeChildren = childrenProp
      ? Array.isArray(childrenProp)
        ? childrenProp
        : [childrenProp]
      : [];

    if (node.props?.id) {
      context.elementById[node.props.id] = node;
    }

    if (position) {
      if (position.type === "absolute") {
        layout.absolute = true;
      }

      const left = getSize(position.left, maxWidth);
      const right = getSize(position.right, maxWidth);
      const top = getSize(position.top, maxWidth);
      const bottom = getSize(position.bottom, maxWidth);

      if (
        typeof position.left !== "undefined" &&
        typeof position.right !== "undefined"
      ) {
        maxWidth = right - left;
      }

      if (
        typeof position.top !== "undefined" &&
        typeof position.bottom !== "undefined"
      ) {
        maxHeight = bottom - top;
      }
    }

    if (style?.width) {
      layout.width = getSize(style.width, maxWidth);
    }

    if (style?.height) {
      layout.height = getSize(style.height, maxHeight);
    }

    let marginLeft = getSize(style?.marginLeft, maxWidth);
    let marginRight = getSize(style?.marginRight, maxWidth);
    let marginTop = getSize(style?.marginTop, maxHeight);
    let marginBottom = getSize(style?.marginBottom, maxHeight);

    const borders = Array.isArray(style?.border)
      ? style?.border
      : style?.border
      ? [style.border]
      : undefined;
    if (borders) {
      for (const border of borders) {
        switch (border.position) {
          case "all":
            marginLeft += border.width;
            marginRight += border.width;
            marginTop += border.width;
            marginBottom += border.width;
            break;
          case "left":
            marginLeft += border.width;
            break;
          case "right":
            marginRight += border.width;
            break;
          case "top":
            marginTop += border.width;
            break;
          case "bottom":
            marginBottom += border.width;
            break;
        }
      }
    }

    if (maxWidth) {
      if (marginLeft) {
        maxWidth -= marginLeft;
        layout.x += marginLeft;
      }

      if (marginRight) {
        maxWidth -= marginRight;
      }
    }

    if (maxHeight) {
      if (marginTop) {
        maxHeight -= marginTop;
        layout.y += marginTop;
      }

      if (marginBottom) {
        maxHeight -= marginBottom;
      }
    }

    let updateWidth = false;
    let updateHeight = false;
    let textContents: string | undefined = "";

    switch (node.type) {
      case "vstack":
        updateHeight = true;
        if (!layout.width) {
          layout.width = maxWidth;
        } else {
          updateWidth = true;
          layout.width -= marginLeft + marginRight;
        }
        break;
      case Fragment:
      case "hstack":
        updateWidth = true;
        if (!layout.height) {
          layout.height = maxHeight;
        } else {
          updateHeight = true;
          layout.height -= marginTop + marginBottom;
        }
        break;
      case "zstack":
        if (!layout.width) {
          layout.width = maxWidth;
        } else {
          updateWidth = true;
          layout.width -= marginLeft + marginRight;
        }

        if (!layout.height) {
          layout.height = maxHeight;
        } else {
          updateHeight = true;
          layout.height -= marginTop + marginBottom;
        }
        break;
      case "text":
        if (!layout.width) {
          layout.width = maxWidth;
        }

        textContents = getNodeTextContents(node);
        layout.height = computeTextHeight(
          ctx,
          textContents,
          style,
          layout.width
        );
        break;
      case "image":
        const image = node.props?.source as Image;
        if (maxWidth && maxHeight) {
          const scale = Math.min(
            maxWidth / image.width,
            maxHeight / image.height
          );
          layout.width = image.width * scale;
          layout.height = image.height * scale;
        } else if (maxWidth) {
          const scale = maxWidth / image.width;
          layout.width = image.width * scale;
          layout.height = image.height * scale;
        } else if (maxHeight) {
          const scale = maxHeight / image.height;
          layout.width = image.width * scale;
          layout.height = image.height * scale;
        }
        break;
    }

    const children: LayoutNode[] = [];
    const newStackingContext = !!position?.type;

    let cX = 0;
    let cY = 0;
    if (nodeChildren) {
      for (const child of nodeChildren) {
        if (!child) {
          continue;
        }

        if (node.type === "text" && typeof child === "string") {
          continue;
        }

        const childContext: LayoutingContext = {
          ...layout,
          x: cX,
          y: cY,
          px: context.px,
          py: context.py,
          maxWidth: layout.width || context.maxWidth,
          maxHeight: layout.height || context.maxHeight,
          width: 0,
          height: 0,
          elementById: context.elementById,
        };

        if (newStackingContext) {
          childContext.px = context.x;
          childContext.py = context.y;
        }

        const layoutNode = performLayout(child, childContext, ctx);
        if (!layoutNode) {
          continue;
        }

        if (!layoutNode.layout.absolute) {
          if (node.type === "vstack") {
            cY = layoutNode.layout.y + layoutNode.layout.height;
          }

          if (node.type === "hstack" || node.type === Fragment) {
            cX = layoutNode.layout.x + layoutNode.layout.width;
          }
        }

        children.push(layoutNode);
      }
    }

    if (!layout.width || node.type === "hstack" || node.type === Fragment) {
      layout.width = cX;
    }

    if (!layout.height || node.type === "vstack") {
      layout.height = cY;
    }

    layout.drawWidth = Math.round(layout.width);
    layout.drawHeight = Math.round(layout.height);

    if (!maxWidth) {
      layout.x += marginLeft;
      layout.width += marginRight;
    }

    if (updateWidth) {
      layout.width = layout.drawWidth + marginLeft + marginRight;
    }

    if (!maxHeight) {
      layout.y += marginTop;
      layout.height += marginBottom;
    }

    if (updateHeight) {
      layout.height = layout.drawHeight + marginTop + marginBottom;
    }

    if (node.props?.valign === "middle" && maxHeight) {
      layout.y = maxHeight / 2 - layout.height / 2;
    }

    if (position) {
      if (position.type === "absolute") {
        layout.absolute = true;
      }

      const left = getSize(position.left, maxWidth);
      const right = getSize(position.right, maxWidth);
      const top = getSize(position.top, maxWidth);
      const bottom = getSize(position.bottom, maxWidth);

      if (typeof position.left !== "undefined") {
        layout.x = left;
      }

      if (typeof position.top !== "undefined") {
        layout.y = top;
      }

      if (typeof position.right !== "undefined") {
        layout.x = -1 * right - 0.01;
      }

      if (typeof position.bottom !== "undefined") {
        layout.y = -1 * bottom - 0.01;
      }
    }

    layout.x = Math.round(layout.x);
    layout.y = Math.round(layout.y);
    layout.width = Math.round(layout.width);
    layout.height = Math.round(layout.height);

    return {
      node,
      layout,
      children,
      textContents,
    };
  } else if (typeof node === "string") {
    const realMaxWidth = context.maxWidth || context.width || 0;
    let maxWidth = realMaxWidth;
    let textContents: string | undefined = "";

    if (!layout.width) {
      layout.width = maxWidth;
    }
    textContents = getNodeTextContents(node);
    layout.height = computeTextHeight(
      ctx,
      textContents,
      undefined,
      layout.width
    );

    layout.drawWidth = Math.round(layout.width);
    layout.drawHeight = Math.round(layout.height);

    layout.x = Math.round(layout.x);
    layout.y = Math.round(layout.y);
    layout.width = Math.round(layout.width);
    layout.height = Math.round(layout.height);

    return {
      node: {
        type: "text",
      },
      layout,
      textContents,
    };
  }

  return {
    node,
    layout: context as any,
  };
}

interface ParentLayout {
  x: number;
  y: number;
}

export async function draw(
  layoutNode: LayoutNode,
  parent: ParentLayout,
  ctx: CanvasRenderingContext2D,
  canvas: Canvas
) {
  if (!layoutNode.node) {
    return;
  }

  ctx.save();

  if (typeof layoutNode.node === "object") {
    const node = layoutNode.node;
    const children = node?.props?.children;
    const layout = layoutNode.layout;
    const style = node.props?.style;
    let x = layout.x;
    let y = layout.y;

    x += parent.x;
    y += parent.y;

    if (x < 0) {
      x = canvas.width + x - layout.width;
    }

    if (y < 0) {
      y = canvas.height + y - layout.height;
    }

    ctx.globalAlpha = style?.opacity || 1;
    ctx.globalCompositeOperation = style?.compositeOperation || "source-over";

    if (style?.backgroundColor) {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(x, y, layout.width, layout.height);
    }

    if (style?.shadow) {
      ctx.shadowOffsetX = style.shadow.x;
      ctx.shadowOffsetY = style.shadow.y;
      ctx.shadowColor = style.shadow.color;
      ctx.shadowBlur = style.shadow.blur;
    }

    switch (node.type) {
      case "image":
        ctx.drawImage(
          node?.props?.source,
          x,
          y,
          layout.drawWidth || layout.width,
          layout.drawHeight || layout.height
        );
        break;
      case "text":
        ctx.font = getFont(style);
        ctx.fillStyle = style?.textColor || "white";

        const lines = getLines(
          ctx,
          layoutNode.textContents || "",
          layout.drawWidth
        );
        const lineHeight = getLineHeight(ctx);

        for (let k = 0; k < lines.length; k++) {
          if (style?.stroke) {
            ctx.strokeStyle = style.stroke.color;
            ctx.lineWidth = style.stroke.width;
            ctx.lineJoin = "round";
            await drawTextWithEmoji(
              ctx,
              "stroke",
              lines[k],
              x,
              y + lineHeight * k,
              layout.drawWidth,
              style?.textAlign
            );
          }
          await drawTextWithEmoji(
            ctx,
            "fill",
            lines[k],
            x,
            y + lineHeight * k,
            layout.drawWidth,
            style?.textAlign
          );
        }
        break;
    }

    const borders = Array.isArray(style?.border)
      ? style?.border
      : style?.border
      ? [style.border]
      : undefined;

    let currentBorderX = x;
    let currentBorderY = y;
    let currentBorderW = layout.drawWidth;
    let currentBorderH = layout.drawHeight;

    if (borders) {
      for (const border of borders) {
        ctx.strokeStyle = border.color;
        ctx.lineWidth = border.width;
        ctx.translate(border.width / 2, border.width / 2);

        switch (border.position) {
          case "all":
            currentBorderX -= border.width;
            currentBorderY -= border.width;
            currentBorderW += border.width;
            currentBorderH += border.width;
            ctx.strokeRect(
              currentBorderX,
              currentBorderY,
              currentBorderW,
              currentBorderH
            );
            currentBorderW += border.width;
            currentBorderH += border.width;
            break;
          case "left":
            currentBorderX -= border.width;
            ctx.beginPath();
            ctx.moveTo(currentBorderX, currentBorderY);
            ctx.lineTo(currentBorderX, currentBorderY + currentBorderH);
            ctx.stroke();
            ctx.closePath();
            break;
          case "right":
            currentBorderW += border.width;
            ctx.beginPath();
            ctx.moveTo(currentBorderX + currentBorderW, currentBorderY);
            ctx.lineTo(
              currentBorderX + currentBorderW,
              currentBorderY + currentBorderH
            );
            ctx.stroke();
            ctx.closePath();
            break;
          case "top":
            currentBorderY -= border.width;
            ctx.beginPath();
            ctx.moveTo(currentBorderX, currentBorderY);
            ctx.lineTo(currentBorderX + currentBorderW, currentBorderY);
            ctx.stroke();
            ctx.closePath();
            break;
          case "bottom":
            currentBorderH += border.width;
            ctx.beginPath();
            ctx.moveTo(currentBorderX, currentBorderY + currentBorderH);
            ctx.lineTo(
              currentBorderX + currentBorderW,
              currentBorderY + currentBorderH
            );
            ctx.stroke();
            ctx.closePath();
            break;
        }

        ctx.translate(-border.width / 2, -border.width / 2);
      }
    }

    ctx.restore();

    if (layoutNode.children) {
      for (const child of layoutNode.children) {
        await draw(child, { x, y }, ctx, canvas);
      }
    }
  }
}

export interface LayoutDocument {
  ctx: CanvasRenderingContext2D;
  canvas: Canvas;
  layoutRoot: LayoutNode;
  elementById: Record<string, MemeFramework.MemeNode>;
}

export function build(root: MemeFramework.MemeNode): LayoutDocument {
  if (typeof root !== "object") {
    throw new Error("must be an instance of MemeNode");
  }

  const rootStyle = root?.props?.style;
  const rootWidth = getSize(rootStyle?.width, 0);
  const rootHeight = getSize(rootStyle?.height, 0);
  const rootMaxWidth = getSize(rootStyle?.maxWidth, 0);
  const rootMaxHeight = getSize(rootStyle?.maxHeight, 0);
  if (!rootWidth && !rootHeight) {
    throw new Error("root node must specify width and/or height");
  }

  const canvas = new Canvas(400, 400);
  const ctx = canvas.getContext("2d")!;
  const elementById: Record<string, MemeFramework.MemeNode> = {};

  const layoutRoot = performLayout(
    root,
    {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      width: rootWidth,
      height: rootHeight,
      maxWidth: Math.max(rootWidth, rootMaxWidth),
      maxHeight: Math.max(rootHeight, rootMaxHeight),
      elementById,
    },
    ctx
  );

  if (!layoutRoot) {
    throw new Error("unknown error");
  }

  if (!layoutRoot.layout.height || !layoutRoot.layout.width) {
    throw new Error("could not compute width/height");
  }

  canvas.width = layoutRoot.layout.width;
  canvas.height = layoutRoot.layout.height;

  return { ctx, canvas, layoutRoot, elementById };
}

export async function render(root: MemeFramework.MemeNode): Promise<Canvas> {
  const { ctx, canvas, layoutRoot } = build(root);
  await draw(layoutRoot, { x: 0, y: 0 }, ctx, canvas);
  return canvas;
}
