import { z } from "zod";

// =====================================================
// AUTENTICACIÓN
// =====================================================

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Correo inválido"),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || (v.length >= 10 && v.length <= 20), {
        message: "Teléfono inválido (mínimo 10 dígitos)",
      }),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const otpVerifySchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().length(8, "El código debe tener 8 dígitos"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// =====================================================
// EVENTOS
// =====================================================

export const ticketPricePhaseSchema = z.object({
  price: z.number().positive("Price must be greater than 0"),
  startsAt: z.string().or(z.date()),
  endsAt: z.string().or(z.date()),
  label: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const ticketTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["GENERAL", "PREFERENTE", "VIP"]),
  price: z.number().positive("Price must be greater than 0"),
  maxQuantity: z.number().int().positive("Quantity must be greater than 0"),
  isTable: z.boolean().optional().default(false),
  seatsPerTable: z.number().int().positive().optional(),
  pricePhases: z.array(ticketPricePhaseSchema).optional(),
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
  imageUrl: z.union([z.string().url("URL de imagen inválida"), z.literal("")]).optional(),
  maxCapacity: z.number().int().positive("Capacity must be greater than 0"),
  salesStartDate: z.string().or(z.date()),
  salesEndDate: z.string().or(z.date()),
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  organizerId: z.string().uuid("Invalid organizer ID").optional(),
  ticketTypes: z.array(ticketTypeSchema).min(1, "At least one ticket type is required"),
});

export const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  logoUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Slug solo puede contener letras minúsculas, números y guiones");

export const organizationProfileSchema = organizationSchema.extend({
  slug: slugSchema.optional(),
  bannerUrl: z.union([z.string().url(), z.literal("")]).optional(),
  websiteUrl: z.union([z.string().url(), z.literal("")]).optional(),
  instagramUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export const updateOrganizationSchema = organizationProfileSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const orgPostSchema = z.object({
  content: z.string().min(1, "El contenido es requerido").max(5000),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional(),
  type: z.enum(["POST", "ANNOUNCEMENT"]).optional().default("POST"),
  notifyFollowers: z.boolean().optional().default(false),
});

export const messageSchema = z.object({
  body: z.string().min(1, "El mensaje no puede estar vacío").max(5000),
});

export const createConversationSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
});

export const updateTicketTypeSchema = ticketTypeSchema
  .partial()
  .extend({
    id: z.string().uuid("Invalid ticket type ID"),
    pricePhases: z.array(ticketPricePhaseSchema).optional(),
  });

export const updateEventSchema = createEventSchema.partial().extend({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  showQR: z.boolean().optional(),
  ticketTypes: z.array(updateTicketTypeSchema).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;


