"use client";

import { useState, type ReactNode } from "react";
import WaitlistModal from "./WaitlistModal";

export default function WaitlistCta({
  className,
  children = "Join the waitlist",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`cursor-pointer ${className ?? ""}`}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <WaitlistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
