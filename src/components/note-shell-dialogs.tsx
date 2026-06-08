"use client";

import { ReactNode } from "react";

type NoteShellDialogProps = {
  label: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function NoteShellDialog({
  label,
  title,
  closeLabel,
  onClose,
  children,
  className
}: NoteShellDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className={className ?? "api-key-dialog"} role="dialog" aria-modal="true" aria-label={label}>
        <div className="dialog-header">
          <h2>{title}</h2>
          <button aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
