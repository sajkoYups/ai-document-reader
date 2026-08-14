"use client";

import type { EvidenceReference as EvidenceRef } from "@/workflows/types";
import { formatEvidenceLabel } from "@/workflows/evidence";

interface EvidenceReferenceProps {
  evidence: EvidenceRef[];
  onOpen?: (ref: EvidenceRef) => void;
}

export default function EvidenceReference({ evidence, onOpen }: EvidenceReferenceProps) {
  if (evidence.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {evidence.map((ref, i) => (
        <button
          key={`${ref.page ?? ""}-${ref.section ?? ""}-${i}`}
          type="button"
          onClick={() => onOpen?.(ref)}
          className="text-xs px-2 py-0.5 rounded-md border border-accent-border text-accent hover:bg-accent-dim cursor-pointer"
        >
          {formatEvidenceLabel(ref)}
        </button>
      ))}
    </div>
  );
}
