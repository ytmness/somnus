import { 
  User, 
  Event, 
  TicketType, 
  Sale, 
  Ticket,
  TicketScan,
  UserRole,
  TicketCategory,
  SaleChannel,
  SaleStatus,
  TicketStatus,
  ScanResult
} from "@prisma/client";

// =====================================================
// TIPOS EXTENDIDOS (con relaciones)
// =====================================================

export type EventWithTicketTypes = Event & {
  ticketTypes: TicketType[];
};

export type SaleWithDetails = Sale & {
  event: Event;
  tickets: Ticket[];
  user?: User | null;
};

export type TicketWithDetails = Ticket & {
  sale: Sale;
  ticketType: TicketType;
};

export type TicketScanWithDetails = TicketScan & {
  ticket: TicketWithDetails;
  user: User;
};

// =====================================================
// DTOs (Data Transfer Objects)
// =====================================================

export interface CreateEventDTO {
  name: string;
  description?: string;
  artist: string;
  tour?: string;
  venue: string;
  address?: string;
  eventDate: Date;
  eventTime: string;
  imageUrl?: string;
  maxCapacity: number;
  salesStartDate: Date;
  salesEndDate: Date;
  ticketTypes: CreateTicketTypeDTO[];
}

export interface CreateTicketTypeDTO {
  name: string;
  description?: string;
  category: TicketCategory;
  price: number;
  maxQuantity: number;
  isTable?: boolean;
  seatsPerTable?: number;
}

export interface CreateSaleDTO {
  eventId: string;
  userId?: string;
  channel: SaleChannel;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  items: SaleItemDTO[];
  paymentMethod?: string;
}

export interface SaleItemDTO {
  ticketTypeId: string;
  quantity: number;
}

export interface TicketValidationResult {
  isValid: boolean;
  ticket?: TicketWithDetails;
  message: string;
  result: ScanResult;
}

// =====================================================
// TIPOS DE RESPUESTA API
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// =====================================================
// FILTROS Y QUERIES
// =====================================================

export interface EventFilters {
  search?: string;
  isActive?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export interface SaleFilters {
  eventId?: string;
  status?: SaleStatus;
  channel?: SaleChannel;
  fromDate?: Date;
  toDate?: Date;
  buyerEmail?: string;
}

export interface TicketFilters {
  saleId?: string;
  status?: TicketStatus;
  eventId?: string;
}

// =====================================================
// REPORTES
// =====================================================

export interface SalesReport {
  totalSales: number;
  totalRevenue: number;
  totalTickets: number;
  byChannel: {
    channel: SaleChannel;
    count: number;
    revenue: number;
  }[];
  byStatus: {
    status: SaleStatus;
    count: number;
  }[];
}

export interface EventReport {
  event: EventWithTicketTypes;
  salesSummary: {
    totalSold: number;
    totalRevenue: number;
    availableTickets: number;
  };
  ticketTypesSummary: {
    ticketType: TicketType;
    sold: number;
    available: number;
    revenue: number;
  }[];
  accessSummary: {
    totalScanned: number;
    totalValid: number;
    totalInvalid: number;
  };
}

// =====================================================
// AUTH Y SESIÓN
// =====================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// =====================================================
// GENERACIÓN DE BOLETOS
// =====================================================

export interface TicketPDFData {
  ticketId: string; // ID del ticket para regenerar el payload
  ticketNumber: string;
  qrCode: string; // Puede ser el hash o el payload JSON completo
  event: {
    name: string;
    artist: string;
    venue: string;
    date: string;
    time: string;
  };
  ticketType: {
    name: string;
    category: TicketCategory;
  };
  buyer: {
    name: string;
    email: string;
  };
  tableNumber?: string;
  seatNumber?: number;
}

// =====================================================
// INVENTARIO
// =====================================================

export interface InventoryUpdate {
  ticketTypeId: string;
  quantityChange: number; // Positivo para agregar, negativo para restar
  reason: string;
}

export interface InventoryStatus {
  ticketType: TicketType;
  available: number;
  sold: number;
  percentage: number;
}

// =====================================================
// DASHBOARD
// =====================================================

export interface DashboardStats {
  todaySales: {
    count: number;
    revenue: number;
  };
  upcomingEvents: number;
  activeUsers: number;
  totalTicketsSold: number;
}

// =====================================================
// EXPORTACIONES DE TIPOS DE PRISMA
// =====================================================

export type {
  User,
  Event,
  TicketType,
  Sale,
  Ticket,
  TicketScan,
  UserRole,
  TicketCategory,
  SaleChannel,
  SaleStatus,
  TicketStatus,
  ScanResult,
};
