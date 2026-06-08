"use client";

import { ChangeEvent, RefObject } from "react";

type EditorActionsOptions = {
  codeLanguage: string;
  content: string;
  loadNotes: () => Promise<void>;
  selectedId: string;
  setContent: (content: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function useEditorActions({
  codeLanguage,
  content,
  loadNotes,
  selectedId,
  setContent,
  textareaRef
}: EditorActionsOptions) {
  function insertSnippet(before: string, after = "") {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${before}${selected || "文本"}${after}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => input.focus());
  }

  function insertCodeBlock() {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = content.slice(start, end).trimEnd();
    const code = selected || "在这里输入代码";
    const prefix = start > 0 && !content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = end < content.length && !content.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const block = `${prefix}\`\`\`${codeLanguage}\n${code}\n\`\`\`${suffix}`;
    const next = `${content.slice(0, start)}${block}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => input.focus());
  }

  async function exportZip() {
    window.location.href = "/api/export";
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;
    const form = new FormData();
    form.set("noteId", selectedId);
    form.set("file", file);
    await fetch("/api/attachments", { method: "POST", body: form });
    await loadNotes();
    event.target.value = "";
  }

  return {
    insertSnippet,
    insertCodeBlock,
    exportZip,
    uploadAttachment
  };
}
