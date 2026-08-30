"use client";

import { useRef } from "react";
import type { EventFormData } from "../types";

interface EventDescriptionProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

type WrapTag =
  | "b"
  | "i"
  | "u"
  | "h1"
  | "h2"
  | "ul"
  | "ol"
  | "blockquote"
  | "code"
  | "a";

function wrapSelection(
  value: string,
  start: number,
  end: number,
  tag: WrapTag
): { next: string; cursor: number } {
  const selected = value.slice(start, end) || "text";
  let wrapped: string;
  if (tag === "a") {
    const href = window.prompt("URL del enlace:", "https://") || "https://";
    wrapped = `<a href="${href}" target="_blank" rel="noopener noreferrer">${selected}</a>`;
  } else if (tag === "ul") {
    const items = selected
      .split(/\n+/)
      .map((line) => `<li>${line.trim() || "item"}</li>`)
      .join("");
    wrapped = `<ul>${items}</ul>`;
  } else if (tag === "ol") {
    const items = selected
      .split(/\n+/)
      .map((line) => `<li>${line.trim() || "item"}</li>`)
      .join("");
    wrapped = `<ol>${items}</ol>`;
  } else {
    wrapped = `<${tag}>${selected}</${tag}>`;
  }
  const next = value.slice(0, start) + wrapped + value.slice(end);
  return { next, cursor: start + wrapped.length };
}

const TOOLBAR: { tag: WrapTag; label: string; title: string }[] = [
  { tag: "b", label: "B", title: "Bold" },
  { tag: "i", label: "I", title: "Italic" },
  { tag: "u", label: "U", title: "Underline" },
  { tag: "h1", label: "H1", title: "Heading 1" },
  { tag: "h2", label: "H2", title: "Heading 2" },
  { tag: "ul", label: "•", title: "Bullet list" },
  { tag: "ol", label: "1.", title: "Numbered list" },
  { tag: "blockquote", label: "“", title: "Quote" },
  { tag: "code", label: "</>", title: "Code" },
  { tag: "a", label: "🔗", title: "Link" },
];

export function EventDescription({ data, onChange }: EventDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyTag = (tag: WrapTag) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { next, cursor } = wrapSelection(data.description, start, end, tag);
    onChange({ description: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  };

  return (
    <div id="section-description">
      <label
        htmlFor="event-desc"
        className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
      >
        About / descripción (opcional)
      </label>
      <div className="flex flex-wrap gap-1 mb-2">
        {TOOLBAR.map((btn) => (
          <button
            key={btn.tag}
            type="button"
            title={btn.title}
            onClick={() => applyTag(btn.tag)}
            className="min-w-[2rem] px-2 py-1 rounded-md border border-white/12 bg-white/[0.04] text-white/80 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            {btn.label}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        id="event-desc"
        value={data.description}
        onChange={(e) => {
          onChange({ description: e.target.value });
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        rows={6}
        className="somnus-input resize-y min-h-[8rem] leading-relaxed font-mono text-[13px]"
        placeholder={
          "Escribe HTML ligero o usa la barra: negrita, listas, enlaces…"
        }
      />
      <p className="mt-1.5 text-[11px] text-white/40">
        Se guarda como HTML. Selecciona texto y usa la barra para envolverlo en
        etiquetas.
      </p>
    </div>
  );
}
