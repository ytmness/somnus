"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ConversationList,
  type ConversationItem,
} from "@/components/mensajes/ConversationList";
import { ChatPanel } from "@/components/mensajes/ChatPanel";

interface Organization {
  id: string;
  name: string;
}

interface OrganizerMessagesTabProps {
  organizations: Organization[];
  currentUserId: string;
}

export function OrganizerMessagesTab({
  organizations,
  currentUserId,
}: OrganizerMessagesTabProps) {
  const [selectedOrgId, setSelectedOrgId] = useState(organizations[0]?.id ?? "");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conversations?organizationId=${selectedOrgId}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (res.ok) {
        setConversations(json.data || []);
        if (!selectedConvId && json.data?.length > 0) {
          setSelectedConvId(json.data[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, selectedConvId]);

  useEffect(() => {
    setSelectedConvId(null);
    void loadConversations();
    const interval = setInterval(() => void loadConversations(), 30000);
    return () => clearInterval(interval);
  }, [selectedOrgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = conversations.find((c) => c.id === selectedConvId);

  if (organizations.length === 0) {
    return (
      <p className="text-white/50 text-sm p-4">
        Crea una organización para recibir mensajes.
      </p>
    );
  }

  return (
    <section className="somnus-card overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-semibold mb-3">Mensajes</h2>
        {organizations.length > 1 && (
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id} className="bg-gray-900">
                {org.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && conversations.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] min-h-[420px]">
          <div className="border-r border-white/10 overflow-y-auto max-h-[60vh]">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConvId}
              currentUserId={currentUserId}
              onSelect={setSelectedConvId}
              showParticipant
            />
          </div>
          <div>
            {selected ? (
              <ChatPanel
                conversationId={selected.id}
                currentUserId={currentUserId}
                title={selected.participant.name}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] text-white/50 text-sm">
                Sin conversaciones aún
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
