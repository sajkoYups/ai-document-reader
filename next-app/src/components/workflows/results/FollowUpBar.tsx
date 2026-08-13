"use client";

import { useState } from "react";
import type { OutputLanguage } from "@/types";
import { t } from "@/workflows/copy";
import Button from "@/components/Button";

interface FollowUpBarProps {
  language: OutputLanguage;
  disabled?: boolean;
  onAsk: (message: string) => void;
}

export default function FollowUpBar({ language, disabled, onAsk }: FollowUpBarProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onAsk(trimmed);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t(language, "result.askAbout")}
        disabled={disabled}
        className="flex-1 bg-surface-0 border border-border rounded-lg px-3 py-2 text-sm
          text-text-primary placeholder:text-text-muted
          focus:outline-none focus:border-accent/40 disabled:opacity-40"
      />
      <Button variant="secondary" size="md" onClick={submit} disabled={disabled || !value.trim()}>
        {t(language, "ask.send")}
      </Button>
    </div>
  );
}
