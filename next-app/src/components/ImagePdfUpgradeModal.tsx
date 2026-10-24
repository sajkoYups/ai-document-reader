"use client";

import { SignInButton } from "@clerk/nextjs";
import Modal from "./Modal";

interface ImagePdfUpgradeModalProps {
  open: boolean;
  signedIn: boolean;
  onClose: () => void;
  onJoinWaitlist: () => void;
  onSwitchToDeep: () => void;
}

export default function ImagePdfUpgradeModal({
  open,
  signedIn,
  onClose,
  onJoinWaitlist,
  onSwitchToDeep,
}: ImagePdfUpgradeModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4 pr-6">
        <div className="space-y-1">
          <h2 className="font-display text-xl text-text-primary">
            This PDF is a picture of the pages
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Standard mode can only copy a text layer, and this file does not
            have one. The words are in the page images. Deep Analysis can read
            those images on our server. This file was not uploaded.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {signedIn ? (
            <button
              type="button"
              onClick={onSwitchToDeep}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
            >
              Use Deep Analysis
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface-2 border border-border text-text-primary hover:bg-surface-3 transition-colors"
              >
                Sign in
              </button>
            </SignInButton>
          )}
          <button
            type="button"
            onClick={onJoinWaitlist}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              signedIn
                ? "bg-surface-2 border border-border text-text-primary hover:bg-surface-3"
                : "bg-accent text-white hover:opacity-90"
            }`}
          >
            Join waitlist
          </button>
        </div>
      </div>
    </Modal>
  );
}
