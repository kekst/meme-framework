import { MemeFramework } from "./types";

const Fragment = "MemeFragment";

function jsx(
  type: MemeFramework.Component | string,
  props?: { [key: string]: any }
): MemeFramework.MemeNode {
  props = { ...props } || {};

  if (typeof type === "function") {
    return type(props);
  }

  return {
    type,
    props,
  };
}

export { jsx, Fragment };
