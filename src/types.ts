import type { Canvas, Image } from "canvas";

export namespace MemeFramework {
  export interface Border {
    position: "top" | "left" | "bottom" | "right" | "all";
    color: string;
    width: number;
  }

  export interface Stroke {
    color: string;
    width: number;
  }

  export interface Shadow {
    x: number;
    y: number;
    color: string;
    blur: number;
  }

  export interface Position {
    type: "absolute" | "relative";
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  }

  export interface Style {
    backgroundColor?: string;
    position?: Position;
    border?: Border | Border[];
    fontStyle?: "bold" | "italic" | undefined;
    shadow?: Shadow;
    textColor?: string;
    textAlign?: CanvasTextAlign;
    width?: string;
    height?: string;
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
    fontFamily?: string;
    fontSize?: string;
    children?: MemeNode[];
    opacity?: number;
    compositeOperation?: ImageCompositeOperation;

    //if both are provided it will automatically scale font
    maxFontSize?: string;

    //if both are provided it will automatically scale font
    minFontSize?: string;

    //only works on text
    stroke?: Stroke;

    //broken
    maxWidth?: string;

    //broken
    maxHeight?: string;
  }

  export interface IntrinsicAttributes {
    style?: Style;
    id?: string;
    children?: MemeNode | MemeNode[];
  }

  export interface StackAttributes extends IntrinsicAttributes {
    align?: HorizontalAlignment;
    valign?: VerticalAlignment;
  }

  export interface VStackAttributes extends StackAttributes {}
  export interface HStackAttributes extends StackAttributes {}
  export interface ZStackAttributes extends StackAttributes {}

  export interface TextAttributes extends IntrinsicAttributes {
    align?: HorizontalAlignment;
  }

  export interface ImageAttributes
    extends Omit<IntrinsicAttributes, "children"> {
    source?: Image | Canvas;
  }

  export type VerticalAlignment = "top" | "middle" | "bottom";
  export type HorizontalAlignment = "left" | "center" | "right";

  export type ImageCompositeOperation =
    | "source-over"
    | "source-in"
    | "source-out"
    | "source-atop"
    | "destination-over"
    | "destination-in"
    | "destination-out"
    | "destination-atop"
    | "lighter"
    | "copy"
    | "xor"
    | "multiply"
    | "screen"
    | "overlay"
    | "darken"
    | "lighten"
    | "color-dodge"
    | "color-burn"
    | "hard-light"
    | "soft-light"
    | "difference"
    | "exclusion"
    | "hue"
    | "saturation"
    | "color"
    | "luminosity";

  export interface MemeElement {
    type: string;
    props?: IntrinsicAttributes & { [key: string]: any };
  }

  export type MemeNode = MemeElement | string | null | undefined;
  export type Component<P = {}> = (props: P) => MemeNode;
}

export namespace MemeFrameworkJSX {
  export type Element = string;
  export interface IntrinsicElements {
    vstack: MemeFramework.VStackAttributes;
    hstack: MemeFramework.HStackAttributes;
    zstack: MemeFramework.ZStackAttributes;
    image: MemeFramework.ImageAttributes;
    text: MemeFramework.TextAttributes;
  }
}
