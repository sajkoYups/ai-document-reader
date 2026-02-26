import { useState } from "react";
import Modal from "./Modal";

export default function PrivacyBadge() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-accent-dim border border-accent-border
          text-accent text-xs font-medium tracking-wide
          hover:bg-accent/15 transition-colors cursor-pointer"
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-accent"
          style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
        />
        Private &middot; On-Device
      </button>

      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-text-primary">
            Your Privacy, Guaranteed
          </h2>
          <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
            <p>
              Your document is processed directly on your device using local AI
              models. It is <strong className="text-text-primary">not</strong>{" "}
              sent to our servers and is{" "}
              <strong className="text-text-primary">not</strong> stored anywhere.
            </p>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#10003;</span>
                All processing occurs locally in your browser
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#10003;</span>
                Documents are never uploaded to any server
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#10003;</span>
                No persistent storage of your files
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#10003;</span>
                Closing the page clears all session data
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
