/**
 * Device tier detection, evaluated once at import. "Mobile" means a coarse
 * pointer (touch-first hardware) or a narrow viewport — the signal used for
 * the lighter param set in `params.ts` and the renderer pixel-ratio cap.
 * Layout keeps using CSS breakpoints; this is for cost decisions only.
 */
export const isMobile: boolean =
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 48rem)").matches);

/**
 * Phones ship 3x displays; rendering the 3D scenes at full DPR costs ~3x the
 * fragments for a difference that is invisible next to the motion and grain.
 * 1.75 keeps edges clean without the battery bill.
 */
export const MAX_PIXEL_RATIO = isMobile ? 1.75 : 2;
