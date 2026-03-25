import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm
        max-w-lg w-full p-0 rounded-xl animate-fade-in-scale m-auto"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="bg-surface-1 border border-border rounded-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary
            transition-colors text-lg leading-none cursor-pointer"
          aria-label="Close"
        >
          &#10005;
        </button>
        {children}
      </div>
    </dialog>
  );
}
