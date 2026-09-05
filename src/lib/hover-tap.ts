import type { FocusEvent, PointerEvent } from "react";

export function hoverTapProps(
  index: number,
  active: number | null,
  open: (index: number) => void,
  close: () => void
) {
  return {
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse") open(index);
    },
    onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse") close();
    },
    onClick: () => {
      if (!window.matchMedia("(hover: none)").matches) return;
      if (active === index) close();
      else open(index);
    },
    onFocus: (event: FocusEvent<HTMLButtonElement>) => {
      if (event.target.matches(":focus-visible")) open(index);
    },
    onBlur: close,
  };
}
