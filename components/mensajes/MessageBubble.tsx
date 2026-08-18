"use client";

interface MessageBubbleProps {
  body: string;
  senderName: string;
  isOwn: boolean;
  createdAt: string;
}

export function MessageBubble({ body, senderName, isOwn, createdAt }: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? "bg-white text-black rounded-br-md"
            : "bg-white/10 text-white rounded-bl-md"
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-medium text-white/60 mb-1">{senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{body}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? "text-black/50" : "text-white/40"}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
