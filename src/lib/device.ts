export const isMobile: boolean =
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 48rem)").matches);

export const MAX_PIXEL_RATIO = isMobile ? 1.75 : 2;
