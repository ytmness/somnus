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

export const tableGroupPriceRowSchema = z.object({
  minGuests: z.number().int().positive(),
  maxGuests: z.number().int().positive(),
  price: z.number().positive("Price must be greater than 0"),
  sortOrder: z.number().int().optional(),
});

const optionalTicketId = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().min(1).nullable().optional()
);

const ticketTypeBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z
    .enum(["GENERAL", "PREFERENTE", "VIP"])
    .optional()
    .default("GENERAL"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  maxQuantity: z.coerce.number().int().positive("Quantity must be greater than 0"),
  isTable: z.boolean().optional().default(false),
  seatsPerTable: z.number().int().positive().optional(),
  pricePhases: z.array(ticketPricePhaseSchema).optional(),
  kind: z.enum(["STANDARD", "TABLE"]).optional().default("STANDARD"),
  isHidden: z.boolean().optional().default(false),
  manualSoldOut: z.boolean().optional().default(false),
  salesStartDate: z.string().or(z.date()).optional().nullable(),
  salesEndDate: z.string().or(z.date()).optional().nullable(),
  validUntil: z.string().or(z.date()).optional().nullable(),
  minPurchaseQty: z.coerce.number().int().positive().optional().default(1),
  maxPurchaseQty: z.coerce.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().optional().default(false),
  /** Plaintext password from the form; server hashes to passwordHash. */
  password: z.string().optional().nullable(),
  clearPassword: z.boolean().optional(),
  linkedTicketTypeId: optionalTicketId,
  tableCapacity: z.number().int().positive().optional().nullable(),
  depositEnabled: z.boolean().optional().default(false),
  depositPercent: z.number().int().min(1).max(99).optional().nullable(),
  variablePricingEnabled: z.boolean().optional().default(false),
  groupPriceRows: z.array(tableGroupPriceRowSchema).optional(),
});

export const ticketTypeSchema = ticketTypeBaseSchema.superRefine((val, ctx) => {
  if (
    val.maxPurchaseQty != null &&
    val.minPurchaseQty != null &&
    val.maxPurchaseQty < val.minPurchaseQty
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "maxPurchaseQty must be >= minPurchaseQty",
      path: ["maxPurchaseQty"],
    });
  }
  if (val.depositEnabled && (val.depositPercent == null || val.depositPercent < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "depositPercent required when deposit is enabled",
      path: ["depositPercent"],
    });
  }
  if (
    val.variablePricingEnabled &&
    (!val.groupPriceRows || val.groupPriceRows.length === 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "groupPriceRows required when variable pricing is enabled",
      path: ["groupPriceRows"],
    });
  }
  if (val.kind === "TABLE" && (!val.tableCapacity || val.tableCapacity < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "tableCapacity required for table tiers",
      path: ["tableCapacity"],
    });
  }
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
  imageUrl: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        v.startsWith("/uploads/") ||
        /^https?:\/\/.+/i.test(v),
      "URL de imagen inválida"
    )
    .optional(),
  imagePosX: z.number().min(0).max(100).optional(),
  imagePosY: z.number().min(0).max(100).optional(),
  imageZoom: z.number().min(1).max(2.5).optional(),
  maxCapacity: z.number().int().positive("Capacity must be greater than 0"),
  salesStartDate: z.string().or(z.date()),
  salesEndDate: z.string().or(z.date()),
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  organizerId: z.string().uuid("Invalid organizer ID").optional(),
  isActive: z.boolean().optional(),
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

export const updateTicketTypeSchema = ticketTypeBaseSchema
  .partial()
  .extend({
    id: z.string().min(1).optional(),
    price: z.coerce.number().positive("Price must be greater than 0").optional(),
    maxQuantity: z.coerce
      .number()
      .int()
      .positive("Quantity must be greater than 0")
      .optional(),
    linkedTicketTypeId: optionalTicketId,
  })
  .superRefine((val, ctx) => {
    if (
      val.maxPurchaseQty != null &&
      val.minPurchaseQty != null &&
      val.maxPurchaseQty < val.minPurchaseQty
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "maxPurchaseQty must be >= minPurchaseQty",
        path: ["maxPurchaseQty"],
      });
    }
    if (val.depositEnabled && (val.depositPercent == null || val.depositPercent < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "depositPercent required when deposit is enabled",
        path: ["depositPercent"],
      });
    }
    if (
      val.variablePricingEnabled &&
      (!val.groupPriceRows || val.groupPriceRows.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "groupPriceRows required when variable pricing is enabled",
        path: ["groupPriceRows"],
      });
    }
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
