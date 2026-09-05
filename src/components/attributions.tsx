"use client";

import { useLayoutEffect, useRef } from "react";

export default function Attributions({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <form method="dialog">
        <button type="submit">Close</button>
      </form>
      <h1>Attributions</h1>
      <p>
        Replace this passage. Credit the hands that cut the patterns, mixed
        the chrome, held the light, and never asked for a lookbook.
      </p>
      <ul>
        <li>Typeface — Brotheric</li>
        <li>Chrome — Three.js, RoomEnvironment, living webcam</li>
        <li>Mist — Custom GLSL</li>
        <li>Stars — star.glb / chromed_stars.glb</li>
        <li>Archive — Studio stills, 2001–now</li>
        <li>You — Lorem ipsum dolor sit amet, fill me in</li>
      </ul>
    </dialog>
  );
}
