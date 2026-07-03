"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  ConversationList,
  type ConversationItem,
} from "@/components/mensajes/ConversationList";
import { ChatPanel } from "@/components/mensajes/ChatPanel";

export default function MensajesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConversation = searchParams.get("conversation");

  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversation);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const json = await res.json();
      if (json.user) setUser({ id: json.user.id, name: json.user.name });
      else router.push("/login");
    };
    void loadUser();
  }, [router]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (res.ok) setConversations(json.data || []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadConversations();
    const interval = setInterval(() => void loadConversations(), 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (initialConversation) setSelectedId(initialConversation);
  }, [initialConversation]);

  const selected = conversations.find((c) => c.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen somnus-bg-main flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen somnus-bg-main text-white">
      <div className="relative">
        <SiteHeader
          eventsHref="/"
          onUserChange={(u) => {
            if (u) setUser({ id: u.id, name: u.name });
            else router.push("/login");
          }}
        />
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-24 pb-8">
        <h1 className="text-2xl font-bold mb-6">Mensajes</h1>

        <div className="somnus-card overflow-hidden grid md:grid-cols-[280px_1fr] min-h-[500px]">
          <div className="border-r border-white/10 overflow-y-auto max-h-[70vh]">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              currentUserId={user?.id ?? ""}
              onSelect={setSelectedId}
            />
          </div>

          <div>
            {selected && user ? (
              <ChatPanel
                conversationId={selected.id}
                currentUserId={user.id}
                title={selected.organization.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-white/50 p-8 text-center">
                <p>Selecciona una conversación</p>
                <Link href="/organizaciones" className="mt-4 text-sm underline hover:text-white">
                  Explorar organizaciones
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
