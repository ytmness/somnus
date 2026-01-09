export interface TicketSection {
  id: string;
  name: string;
  description: string;
  price: number;
  available: number;
}

export interface Concert {
  id: string;
  artist: string;
  tour: string;
  date: string;
  time: string;
  venue: string;
  image: string;
  minPrice: number;
  sections: TicketSection[];
}

export interface CartItem {
  concertId: string;
  concertName: string;
  section: string;
  price: number;
  quantity: number;
  date: string;
}

