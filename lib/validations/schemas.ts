import { z } from "zod";

// =====================================================
// AUTENTICACIÓN
// =====================================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["ADMIN", "VENDEDOR", "SUPERVISOR", "ACCESOS", "CLIENTE"]).optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().email("Invalid email"),
  token: z.string().length(8, "Code must be 8 digits"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// =====================================================
// EVENTOS
// =====================================================

export const ticketTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["GENERAL", "PREFERENTE", "VIP"]),
  price: z.number().positive("Price must be greater than 0"),
  maxQuantity: z.number().int().positive("Quantity must be greater than 0"),
  isTable: z.boolean().optional().default(false),
  seatsPerTable: z.number().int().positive().optional(),
});

export const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  artist: z.string().min(1, "Artist is required"),
  tour: z.string().optional(),
  venue: z.string().min(1, "Venue is required"),
  address: z.string().optional(),
  eventDate: z.string().or(z.date()),
  eventTime: z.string().min(1, "Time is required"),
  imageUrl: z.string().url("Invalid image URL").optional(),
  maxCapacity: z.number().int().positive("Capacity must be greater than 0"),
  salesStartDate: z.string().or(z.date()),
  salesEndDate: z.string().or(z.date()),
  ticketTypes: z.array(ticketTypeSchema).min(1, "At least one ticket type is required"),
});

export const updateTicketTypeSchema = ticketTypeSchema
  .partial()
  .extend({ id: z.string().uuid("Invalid ticket type ID") });

export const updateEventSchema = createEventSchema.partial().extend({
  isActive: z.boolean().optional(),
  showQR: z.boolean().optional(),
  ticketTypes: z.array(updateTicketTypeSchema).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;


