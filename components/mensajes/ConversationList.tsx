"use client";

import Image from "next/image";

export interface ConversationItem {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  participant: { id: string; name: string; email: string };
  lastMessage: {
    body: string;
    senderUserId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  selectedId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  showParticipant?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  onSelect,
  showParticipant = false,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <p className="text-white/50 text-sm p-4 text-center">No hay conversaciones.</p>
    );
  }

  return (
    <ul className="divide-y divide-white/10">
      {conversations.map((c) => {
        const title = showParticipant ? c.participant.name : c.organization.name;
        const avatar = showParticipant ? null : c.organization.logoUrl;
        const preview = c.lastMessage?.body ?? "Sin mensajes";
        const isUnread = c.unreadCount > 0;

        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors ${
                selectedId === c.id ? "bg-white/10" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {avatar ? (
                  <Image src={avatar} alt="" width={40} height={40} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-sm font-bold text-white/60">
                    {title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <p className={`font-medium truncate ${isUnread ? "text-white" : "text-white/80"}`}>
                    {title}
                  </p>
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-2" />
                  )}
                </div>
                <p className="text-white/50 text-xs truncate">{preview}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
