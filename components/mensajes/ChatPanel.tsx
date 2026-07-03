"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { MessageBubble } from "./MessageBubble";

interface Message {
  id: string;
  body: string;
  senderUserId: string;
  createdAt: string;
  sender: { id: string; name: string };
}

interface ChatPanelProps {
  conversationId: string;
  currentUserId: string;
  title: string;
  pollInterval?: number;
}

export function ChatPanel({
  conversationId,
  currentUserId,
  title,
  pollInterval = 20000,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) {
        setMessages(json.data || []);
        await fetch(`/api/conversations/${conversationId}/read`, {
          method: "PATCH",
          credentials: "include",
        });
      }
    } catch {
      /* ignore poll errors */
    }
  }, [conversationId]);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(), pollInterval);
    return () => clearInterval(interval);
  }, [loadMessages, pollInterval]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: body.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessages((prev) => [...prev, json.data]);
      setBody("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            body={msg.body}
            senderName={msg.sender.name}
            isOwn={msg.senderUserId === currentUserId}
            createdAt={msg.createdAt}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-white/10 p-4 flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="p-2.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
