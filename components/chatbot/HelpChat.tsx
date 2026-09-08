"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, X } from "lucide-react";
import {
  SomnusAvatar,
  type AvatarMood,
} from "@/components/chatbot/SomnusAvatar";
import {
  CHAT_INTRO,
  type FaqLink,
} from "@/lib/chatbot/faqs";
import { FAQ_FALLBACK, matchFaq } from "@/lib/chatbot/match";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  from: "vaiven" | "user";
  text: string;
  links?: FaqLink[];
};

const STAFF_PREFIXES = [
  "/admin",
  "/organizador",
  "/vendedor",
  "/supervisor",
  "/accesos",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function HelpChatHost() {
  const pathname = usePathname() || "/";
  const hidden = STAFF_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (hidden) return null;
  return <HelpChat />;
}

function HelpChat() {
  const panelId = useId();
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [mood, setMood] = useState<AvatarMood>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "intro", from: "vaiven", text: CHAT_INTRO },
  ]);
  const moodSeq = useRef(0);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  function reply(text: string) {
    const entry = matchFaq(text);
    const id = ++moodSeq.current;
    setMood("think");
    setMessages((current) => [
      ...current,
      { id: makeId(), from: "user", text },
    ]);

    window.setTimeout(() => {
      if (moodSeq.current !== id) return;
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          from: "vaiven",
          text: entry?.answer ?? FAQ_FALLBACK,
          links: entry?.links,
        },
      ]);
      setMood(entry ? "talk" : "think");
    }, 1100);

    window.setTimeout(() => {
      if (moodSeq.current !== id) return;
      if (entry) setMood("happy");
    }, 2500);

    window.setTimeout(() => {
      if (moodSeq.current !== id) return;
      setMood("idle");
    }, entry ? 3800 : 2400);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    reply(text);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] flex justify-end px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
      <div className="pointer-events-auto relative mb-1 max-sm:mb-[3.25rem]">
        {open ? (
          <section
            aria-labelledby={`${panelId}-title`}
            className="mb-2 flex h-[min(22rem,52dvh)] w-[min(17.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-[#121212] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]"
            id={panelId}
          >
            <header className="flex items-center gap-2 px-2.5 py-2">
              <div className="shrink-0">
                <SomnusAvatar mood={mood} size={58} />
              </div>
              <h2
                className="min-w-0 flex-1 truncate text-[13px] font-medium text-white"
                id={`${panelId}-title`}
              >
                Vaivén
              </h2>
              <button
                aria-label="Cerrar chat"
                className="grid size-8 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </header>

            <div
              className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2"
              ref={listRef}
            >
              {messages.map((message) => {
                const own = message.from === "user";
                return (
                  <div
                    className={cn("flex", own ? "justify-end" : "justify-start")}
                    key={message.id}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-3 py-1.5 text-[13px] leading-snug text-white",
                        own
                          ? "rounded-2xl rounded-br-md bg-[#5B8DEF]"
                          : "rounded-2xl rounded-bl-md bg-white/10"
                      )}
                    >
                      <p>{message.text}</p>
                      {message.links?.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {message.links.map((link) => (
                            <Link
                              className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[#7BA3E8] hover:bg-white/15"
                              href={link.href}
                              key={link.href}
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1"
              onSubmit={onSubmit}
            >
              <label className="sr-only" htmlFor={inputId}>
                Pregunta a Vaivén
              </label>
              <input
                autoComplete="off"
                className="min-h-10 min-w-0 flex-1 rounded-full bg-white/5 px-3.5 text-[13px] text-white placeholder:text-white/35 outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF]/60"
                id={inputId}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Mensaje…"
                value={input}
              />
              <button
                aria-label="Enviar"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[#5B8DEF] text-white transition-transform duration-150 hover:bg-[#7BA3E8] active:scale-[0.97]"
                type="submit"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          </section>
        ) : null}

        <button
          aria-controls={panelId}
          aria-expanded={open}
          aria-label={open ? "Cerrar ayuda de Vaivén" : "Abrir ayuda de Vaivén"}
          className="ml-auto flex size-16 items-center justify-center overflow-visible rounded-full border border-white/15 bg-[#121212] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)] transition-transform duration-150 hover:border-[#5B8DEF]/50 active:scale-[0.97]"
          onClick={() =>
            setOpen((value) => {
              const next = !value;
              if (next) {
                moodSeq.current += 1;
                const id = moodSeq.current;
                setMood("happy");
                window.setTimeout(() => {
                  if (moodSeq.current === id) setMood("idle");
                }, 1600);
              }
              return next;
            })
          }
          type="button"
        >
          {open ? (
            <X className="size-5 text-white" />
          ) : (
            <SomnusAvatar mood="idle" size={44} />
          )}
        </button>
      </div>
    </div>
  );
}
