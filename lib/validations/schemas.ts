import { z } from "zod";

// =====================================================
// AUTENTICACIÓN
// =====================================================

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  role: z.enum(["ADMIN", "VENDEDOR", "SUPERVISOR", "ACCESOS", "CLIENTE"]).optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().email("Email inválido"),
  token: z.string().length(8, "El código debe tener 8 dígitos"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// =====================================================
// EVENTOS
// =====================================================

export const ticketTypeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category: z.enum(["GENERAL", "PREFERENTE", "VIP"]),
  price: z.number().positive("El precio debe ser mayor a 0"),
  maxQuantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
  isTable: z.boolean().optional().default(false),
  seatsPerTable: z.number().int().positive().optional(),
});

export const createEventSchema = z.object({
  name: z.string().min(1, "El nombre del evento es requerido"),
  description: z.string().optional(),
  artist: z.string().min(1, "El artista es requerido"),
  tour: z.string().optional(),
  venue: z.string().min(1, "El venue es requerido"),
  address: z.string().optional(),
  eventDate: z.string().or(z.date()),
  eventTime: z.string().min(1, "La hora es requerida"),
  imageUrl: z.string().url("URL de imagen inválida").optional(),
  maxCapacity: z.number().int().positive("La capacidad debe ser mayor a 0"),
  salesStartDate: z.string().or(z.date()),
  salesEndDate: z.string().or(z.date()),
  ticketTypes: z.array(ticketTypeSchema).min(1, "Debe haber al menos un tipo de boleto"),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;

