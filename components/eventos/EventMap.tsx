"use client";

interface EventMapProps {
  venue: string;
  address?: string | null;
  className?: string;
}

export function EventMap({ venue, address, className = "" }: EventMapProps) {
  const query = [venue, address].filter(Boolean).join(", ");
  if (!query.trim()) return null;

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 ${className}`}>
      <div className="bg-[#141414] px-4 py-3 flex items-center justify-between border-b border-white/10">
        <span className="text-white font-semibold">{venue}</span>
        <a
          href={mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#7BA3E8] hover:text-[#5B8DEF] transition-colors flex items-center gap-1"
        >
          Open in Maps
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
      <div className="relative w-full aspect-[16/10] md:aspect-[2/1] min-h-[240px]">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map: ${venue}`}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}
