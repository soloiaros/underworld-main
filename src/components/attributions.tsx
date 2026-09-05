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
      <ul>
        <li>Typeface — Brotheric, Author Username: Burntilldead, Website: https://www.burntilldeadstudio.com, Instagram: https://www.instagram.com/btdstudiodesign/</li>
        <li>"Customers" — Joe Budden, DMX, Nelly, St. Lunatics</li>
        <li>Icons - Vecteezy.com</li>
      </ul>
    </dialog>
  );
}
