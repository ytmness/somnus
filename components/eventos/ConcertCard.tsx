import { Calendar, MapPin, Clock } from "lucide-react";
import { Concert } from "./types";

interface ConcertCardProps {
  concert: Concert;
  onSelectConcert: (concert: Concert) => void;
}

export function ConcertCard({ concert, onSelectConcert }: ConcertCardProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-[#5B8DEF]/20 h-full">
      <div className="relative h-44 overflow-hidden">
        <img 
          src={concert.image} 
          alt={concert.artist}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#49484e]/80 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white mb-1">{concert.artist}</h3>
          <p className="text-[#5B8DEF]">{concert.tour}</p>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-[#49484e]/70">
          <Calendar className="w-4 h-4" />
          <span>{concert.date}</span>
        </div>
        
        <div className="flex items-center gap-2 text-[#49484e]/70">
          <Clock className="w-4 h-4" />
          <span>{concert.time}</span>
        </div>
        
        <div className="flex items-center gap-2 text-[#49484e]/70">
          <MapPin className="w-4 h-4" />
          <span>{concert.venue}</span>
        </div>
        
        <div className="pt-2">
          <p className="text-[#49484e]/60 mb-2">Desde</p>
          <p className="text-[#5B8DEF] mb-3">${concert.minPrice.toLocaleString()} MXN</p>
        </div>
        
        <button
          onClick={() => onSelectConcert(concert)}
          className="w-full py-3 rounded-lg bg-[#49484e] text-[#f9fbf6] hover:bg-[#5a595f] transition-colors"
        >
          Ver Boletos
        </button>
      </div>
    </div>
  );
}


