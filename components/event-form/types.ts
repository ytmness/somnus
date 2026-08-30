import type { PricePhaseFormRow } from "@/components/admin/TicketPricePhasesFields";
import type { TableGroupPriceFormRow } from "@/components/admin/TableGroupPriceFields";
import {
  DEFAULT_IMAGE_FRAMING,
  normalizeImageFraming,
  type ImageFraming,
} from "@/lib/utils/image-framing";

export type EventFormMode = "admin" | "organizer";
export type { ImageFraming };
export type TicketKind = "STANDARD" | "TABLE";
export type EventFormStatus = "DRAFT" | "PUBLISHED";

export const EVENT_FORM_CURRENCIES = [
  "MXN",
  "USD",
  "EUR",
  "COP",
  "ARS",
  "CLP",
  "PEN",
  "BRL",
  "GBP",
] as const;
export type EventFormCurrency = (typeof EVENT_FORM_CURRENCIES)[number];

export const EVENT_FORM_TIMEZONES = [
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
] as const;

export interface OrganizationOption {
  id: string;
  name: string;
}

export interface ArtistForm {
  name: string;
  instagramUrl: string;
  spotifyUrl: string;
  imageUrl: string;
  sortOrder: number;
}

export function createEmptyArtist(sortOrder = 0): ArtistForm {
  return {
    name: "",
    instagramUrl: "",
    spotifyUrl: "",
    imageUrl: "",
    sortOrder,
  };
}

export interface TicketTypeForm {
  /** Present when editing an existing ticket tier */
  id?: string;
  kind: TicketKind;
  name: string;
  description: string;
  category: "GENERAL" | "PREFERENTE" | "VIP";
  price: number;
  maxQuantity: number;
  soldQuantity?: number;
  isHidden: boolean;
  manualSoldOut: boolean;
  /** Legacy VIP map tables — always false for wizard-managed tiers */
  isTable: boolean;
  pricePhases: PricePhaseFormRow[];
  salesStartDate: string;
  salesEndDate: string;
  validUntil: string;
  minPurchaseQty: number;
  maxPurchaseQty: number | null;
  requiresApproval: boolean;
  /** UI-only: show password field */
  passwordEnabled: boolean;
  /** New password plaintext; empty means leave unchanged */
  password: string;
  clearPassword: boolean;
  /** Existing server has passwordHash */
  hasPassword: boolean;
  linkedTicketTypeId: string | null;
  tableCapacity: number | null;
  depositEnabled: boolean;
  depositPercent: number | null;
  variablePricingEnabled: boolean;
  groupPriceRows: TableGroupPriceFormRow[];
}

export interface EventFormData {
  name: string;
  description: string;
  artist: string;
  tour: string;
  venue: string;
  address: string;
  city: string;
  eventDate: string;
  eventTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  currency: EventFormCurrency;
  externalUrl: string;
  videoUrl: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  songPreviewUrl: string;
  status: EventFormStatus;
  membersOnly: boolean;
  artists: ArtistForm[];
  imageUrl: string;
  imagePosX: number;
  imagePosY: number;
  imageZoom: number;
  maxCapacity: number;
  salesStartDate: string;
  salesEndDate: string;
  organizationId: string;
  isActive: boolean;
  ticketTypes: TicketTypeForm[];
}

export function createEmptyTicketType(
  kind: TicketKind = "STANDARD"
): TicketTypeForm {
  return {
    kind,
    name: kind === "TABLE" ? "Mesa" : "General",
    description: kind === "TABLE" ? "Table reservation" : "General admission",
    category: kind === "TABLE" ? "VIP" : "GENERAL",
    price: 0,
    maxQuantity: kind === "TABLE" ? 10 : 100,
    soldQuantity: 0,
    isHidden: false,
    manualSoldOut: false,
    isTable: false,
    pricePhases: [],
    salesStartDate: "",
    salesEndDate: "",
    validUntil: "",
    minPurchaseQty: 1,
    maxPurchaseQty: null,
    requiresApproval: false,
    passwordEnabled: false,
    password: "",
    clearPassword: false,
    hasPassword: false,
    linkedTicketTypeId: null,
    tableCapacity: kind === "TABLE" ? 4 : null,
    depositEnabled: false,
    depositPercent: 30,
    variablePricingEnabled: false,
    groupPriceRows: [],
  };
}

export function createInitialFormData(
  organizations?: OrganizationOption[]
): EventFormData {
  return {
    name: "",
    description: "",
    artist: "",
    tour: "",
    venue: "",
    address: "",
    city: "",
    eventDate: "",
    eventTime: "",
    endDate: "",
    endTime: "",
    timezone: "America/Mexico_City",
    currency: "MXN",
    externalUrl: "",
    videoUrl: "",
    songId: "",
    songTitle: "",
    songArtist: "",
    songPreviewUrl: "",
    status: "PUBLISHED",
    membersOnly: false,
    artists: [],
    imageUrl: "",
    imagePosX: DEFAULT_IMAGE_FRAMING.posX,
    imagePosY: DEFAULT_IMAGE_FRAMING.posY,
    imageZoom: DEFAULT_IMAGE_FRAMING.zoom,
    maxCapacity: 0,
    salesStartDate: "",
    salesEndDate: "",
    organizationId: organizations?.[0]?.id || "",
    isActive: true,
    ticketTypes: [createEmptyTicketType("STANDARD")],
  };
}

export function toDateInputValue(d: string | Date): string {
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

export function toDateTimeLocalValue(d: string | Date): string {
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function optionalDateTime(v?: string | Date | null): string {
  if (!v) return "";
  return toDateTimeLocalValue(v);
}

/** Map a GET /api/events/:id payload into EventFormData for the shared wizard. */
export function mapApiEventToFormData(event: {
  name: string;
  description?: string | null;
  artist: string;
  tour?: string | null;
  venue: string;
  address?: string | null;
  city?: string | null;
  eventDate: string | Date;
  eventTime: string;
  endDate?: string | Date | null;
  endTime?: string | null;
  timezone?: string | null;
  currency?: string | null;
  externalUrl?: string | null;
  videoUrl?: string | null;
  songId?: string | null;
  songTitle?: string | null;
  songArtist?: string | null;
  songPreviewUrl?: string | null;
  status?: string | null;
  membersOnly?: boolean | null;
  artists?: Array<{
    sortOrder?: number;
    artist?: {
      name: string;
      instagramUrl?: string | null;
      spotifyUrl?: string | null;
      imageUrl?: string | null;
    };
    name?: string;
    instagramUrl?: string | null;
    spotifyUrl?: string | null;
    imageUrl?: string | null;
  }>;
  imageUrl?: string | null;
  imagePosX?: number | null;
  imagePosY?: number | null;
  imageZoom?: number | null;
  maxCapacity: number;
  salesStartDate: string | Date;
  salesEndDate: string | Date;
  organizationId?: string | null;
  isActive?: boolean;
  ticketTypes?: Array<{
    id: string;
    name: string;
    description?: string | null;
    category: string;
    price: number | string;
    maxQuantity: number;
    soldQuantity?: number;
    isTable?: boolean;
    kind?: string | null;
    isHidden?: boolean;
    manualSoldOut?: boolean;
    salesStartDate?: string | Date | null;
    salesEndDate?: string | Date | null;
    validUntil?: string | Date | null;
    minPurchaseQty?: number | null;
    maxPurchaseQty?: number | null;
    requiresApproval?: boolean;
    passwordHash?: string | null;
    linkedTicketTypeId?: string | null;
    tableCapacity?: number | null;
    depositEnabled?: boolean;
    depositPercent?: number | null;
    variablePricingEnabled?: boolean;
    pricePhases?: Array<{
      price: number | string;
      startsAt: string | Date;
      endsAt: string | Date;
      label?: string | null;
    }>;
    groupPriceRows?: Array<{
      minGuests: number;
      maxGuests: number;
      price: number | string;
    }>;
  }>;
}): EventFormData {
  // Solo entradas en el creador. Mesas (TABLE / links) se gestionan en Table Invites.
  const tickets = (event.ticketTypes || []).filter(
    (tt) => tt.kind !== "TABLE" && !tt.isTable
  );
  const currencyRaw = (event.currency || "MXN").toUpperCase();
  const currency = (EVENT_FORM_CURRENCIES as readonly string[]).includes(
    currencyRaw
  )
    ? (currencyRaw as EventFormCurrency)
    : "MXN";
  const status: EventFormStatus =
    event.status === "DRAFT" ? "DRAFT" : "PUBLISHED";

  const mappedArtists: ArtistForm[] = (event.artists || []).map((row, i) => {
    const a = row.artist || row;
    return {
      name: a.name || "",
      instagramUrl: a.instagramUrl || "",
      spotifyUrl: a.spotifyUrl || "",
      imageUrl: a.imageUrl || "",
      sortOrder: row.sortOrder ?? i,
    };
  });

  return {
    name: event.name || "",
    description: event.description || "",
    artist: event.artist || "",
    tour: event.tour || "",
    venue: event.venue || "",
    address: event.address || "",
    city: event.city || "",
    eventDate: toDateInputValue(event.eventDate),
    eventTime: event.eventTime || "",
    endDate: event.endDate ? toDateInputValue(event.endDate) : "",
    endTime: event.endTime || "",
    timezone: event.timezone || "America/Mexico_City",
    currency,
    externalUrl: event.externalUrl || "",
    videoUrl: event.videoUrl || "",
    songId: event.songId || "",
    songTitle: event.songTitle || "",
    songArtist: event.songArtist || "",
    songPreviewUrl: event.songPreviewUrl || "",
    status,
    membersOnly: Boolean(event.membersOnly),
    artists: mappedArtists,
    imageUrl: event.imageUrl || "",
    ...(() => {
      const f = normalizeImageFraming({
        posX: event.imagePosX ?? undefined,
        posY: event.imagePosY ?? undefined,
        zoom: event.imageZoom ?? undefined,
      });
      return { imagePosX: f.posX, imagePosY: f.posY, imageZoom: f.zoom };
    })(),
    maxCapacity: event.maxCapacity || 0,
    salesStartDate: toDateTimeLocalValue(event.salesStartDate),
    salesEndDate: toDateTimeLocalValue(event.salesEndDate),
    organizationId: event.organizationId || "",
    isActive: event.isActive ?? true,
    ticketTypes:
      tickets.length > 0
        ? tickets.map((tt) => {
            const kind: TicketKind =
              tt.kind === "TABLE" ? "TABLE" : "STANDARD";
            const hasPassword = Boolean(tt.passwordHash);
            return {
              id: tt.id,
              kind,
              name: tt.name,
              description: tt.description || "",
              category: (["GENERAL", "PREFERENTE", "VIP"].includes(tt.category)
                ? tt.category
                : "GENERAL") as TicketTypeForm["category"],
              price: typeof tt.price === "number" ? tt.price : Number(tt.price),
              maxQuantity: tt.maxQuantity,
              soldQuantity: tt.soldQuantity ?? 0,
              isHidden: Boolean(tt.isHidden),
              manualSoldOut: Boolean(tt.manualSoldOut),
              isTable: false,
              pricePhases: (tt.pricePhases || []).map((p) => ({
                price: Number(p.price),
                startsAt: toDateTimeLocalValue(p.startsAt),
                endsAt: toDateTimeLocalValue(p.endsAt),
                label: p.label || "",
              })),
              salesStartDate: optionalDateTime(tt.salesStartDate),
              salesEndDate: optionalDateTime(tt.salesEndDate),
              validUntil: optionalDateTime(tt.validUntil),
              minPurchaseQty: tt.minPurchaseQty ?? 1,
              maxPurchaseQty: tt.maxPurchaseQty ?? null,
              requiresApproval: Boolean(tt.requiresApproval),
              passwordEnabled: hasPassword,
              password: "",
              clearPassword: false,
              hasPassword,
              linkedTicketTypeId: tt.linkedTicketTypeId ?? null,
              tableCapacity: tt.tableCapacity ?? (kind === "TABLE" ? 4 : null),
              depositEnabled: Boolean(tt.depositEnabled),
              depositPercent: tt.depositPercent ?? 30,
              variablePricingEnabled: Boolean(tt.variablePricingEnabled),
              groupPriceRows: (tt.groupPriceRows || []).map((r) => ({
                minGuests: r.minGuests,
                maxGuests: r.maxGuests,
                price: Number(r.price),
              })),
            };
          })
        : [createEmptyTicketType("STANDARD")],
  };
}

/**
 * Validates the whole form in one pass (no step gating). Returns every
 * missing/invalid field as a human-readable message, in a stable order so
 * the first message can be used to decide which section to scroll to.
 */
export function validateAll(
  data: EventFormData,
  mode: EventFormMode,
  opts?: { isEdit?: boolean }
): string[] {
  const errors: string[] = [];

  if (mode === "organizer" && !data.organizationId) {
    errors.push("Select an organization");
  }
  if (!data.name.trim()) errors.push("Event name is required");
  if (!data.artist.trim()) errors.push("Organizer is required");

  if (!data.venue.trim()) errors.push("Venue is required");
  if (!data.eventDate) errors.push("Event date is required");
  if (!data.eventTime) errors.push("Event time is required");
  if (!data.maxCapacity || data.maxCapacity < 1) {
    errors.push("Capacity must be at least 1");
  }
  if (!data.salesStartDate) errors.push("Sales start date is required");
  if (!data.salesEndDate) errors.push("Sales end date is required");

  if (data.ticketTypes.length === 0) {
    errors.push("Add at least one ticket tier");
  } else if (
    data.ticketTypes.some(
      (tt) => !tt.name.trim() || tt.price <= 0 || tt.maxQuantity <= 0
    )
  ) {
    errors.push("Complete every ticket tier (name, price > 0, quantity > 0)");
  }

  for (const tt of data.ticketTypes) {
    if (tt.kind === "TABLE" && (!tt.tableCapacity || tt.tableCapacity < 1)) {
      errors.push(`"${tt.name || "Mesa"}": table capacity is required`);
    }
    if (tt.depositEnabled && (!tt.depositPercent || tt.depositPercent < 1)) {
      errors.push(`"${tt.name || "Ticket"}": deposit % is required`);
    }
    if (tt.variablePricingEnabled && tt.groupPriceRows.length === 0) {
      errors.push(`"${tt.name || "Mesa"}": add at least one group price`);
    }
    if (
      tt.maxPurchaseQty != null &&
      tt.maxPurchaseQty < tt.minPurchaseQty
    ) {
      errors.push(`"${tt.name || "Ticket"}": max purchase must be ≥ min`);
    }
  }

  if (opts?.isEdit) {
    for (const tt of data.ticketTypes) {
      const sold = tt.soldQuantity ?? 0;
      if (sold > 0 && tt.maxQuantity < sold) {
        errors.push(
          `"${tt.name || "Ticket"}": quantity cannot be below sold (${sold})`
        );
      }
    }
  }

  return errors;
}

/** Section id to scroll into view for the first validation error, by keyword. */
export function firstErrorSectionId(errors: string[]): string | null {
  if (errors.length === 0) return null;
  const first = errors[0].toLowerCase();
  if (
    first.includes("ticket") ||
    first.includes("sold") ||
    first.includes("quantity") ||
    first.includes("mesa") ||
    first.includes("deposit") ||
    first.includes("group") ||
    first.includes("capacity")
  ) {
    if (first.includes("capacity") && !first.includes("table")) {
      return "section-when";
    }
    return "section-tickets";
  }
  if (
    first.includes("venue") ||
    first.includes("date") ||
    first.includes("time") ||
    first.includes("sales")
  ) {
    return "section-when";
  }
  return "section-basics";
}

function mapPhases(tt: TicketTypeForm) {
  return tt.pricePhases.length > 0
    ? {
        pricePhases: tt.pricePhases.map((p, i) => ({
          price: p.price,
          startsAt: new Date(p.startsAt).toISOString(),
          endsAt: new Date(p.endsAt).toISOString(),
          label: p.label || undefined,
          sortOrder: i,
        })),
      }
    : { pricePhases: [] as Array<never> };
}

function toEventSalesIso(v: string): string {
  return new Date(v).toISOString();
}

function ticketPayloadFields(
  tt: TicketTypeForm,
  event: Pick<EventFormData, "salesStartDate" | "salesEndDate">
) {
  const startRaw = tt.salesStartDate || event.salesStartDate;
  const endRaw = tt.salesEndDate || event.salesEndDate;
  return {
    kind: tt.kind,
    name: tt.name,
    description: tt.description || undefined,
    // Category UI removed from the wizard; keep Prisma enum compatible.
    // TABLE kind historically used VIP; STANDARD always GENERAL.
    category: tt.kind === "TABLE" ? ("VIP" as const) : ("GENERAL" as const),
    price: Number(tt.price) || 0,
    maxQuantity: Number(tt.maxQuantity) || 0,
    isTable: tt.kind === "TABLE",
    isHidden: Boolean(tt.isHidden),
    manualSoldOut: Boolean(tt.manualSoldOut),
    salesStartDate: startRaw ? new Date(startRaw).toISOString() : null,
    salesEndDate: endRaw ? new Date(endRaw).toISOString() : null,
    validUntil: tt.validUntil ? new Date(tt.validUntil).toISOString() : null,
    minPurchaseQty: tt.minPurchaseQty || 1,
    maxPurchaseQty: tt.maxPurchaseQty,
    requiresApproval: tt.requiresApproval,
    ...(tt.clearPassword
      ? { clearPassword: true }
      : tt.password
        ? { password: tt.password }
        : {}),
    linkedTicketTypeId: tt.linkedTicketTypeId || null,
    tableCapacity: tt.kind === "TABLE" ? tt.tableCapacity : null,
    depositEnabled: tt.kind === "TABLE" ? tt.depositEnabled : false,
    depositPercent:
      tt.kind === "TABLE" && tt.depositEnabled ? tt.depositPercent : null,
    variablePricingEnabled:
      tt.kind === "TABLE" ? tt.variablePricingEnabled : false,
    groupPriceRows:
      tt.kind === "TABLE" && tt.variablePricingEnabled
        ? tt.groupPriceRows.map((r, i) => ({
            minGuests: r.minGuests,
            maxGuests: r.maxGuests,
            price: r.price,
            sortOrder: i,
          }))
        : [],
    ...mapPhases(tt),
  };
}

function optionalStr(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

function artistsPayload(artists: ArtistForm[]) {
  return artists
    .filter((a) => a.name.trim())
    .map((a, i) => ({
      name: a.name.trim(),
      instagramUrl: optionalStr(a.instagramUrl),
      spotifyUrl: optionalStr(a.spotifyUrl),
      imageUrl: optionalStr(a.imageUrl),
      sortOrder: a.sortOrder ?? i,
    }));
}

function eventExtrasPayload(data: EventFormData) {
  const status = data.status;
  const isActive = status === "DRAFT" ? false : data.isActive;
  return {
    city: optionalStr(data.city),
    endDate: data.endDate || undefined,
    endTime: optionalStr(data.endTime),
    timezone: data.timezone || "America/Mexico_City",
    currency: data.currency || "MXN",
    externalUrl: optionalStr(data.externalUrl),
    videoUrl: optionalStr(data.videoUrl),
    songId: optionalStr(data.songId),
    songTitle: optionalStr(data.songTitle),
    songArtist: optionalStr(data.songArtist),
    songPreviewUrl: optionalStr(data.songPreviewUrl),
    status,
    membersOnly: Boolean(data.membersOnly),
    artists: artistsPayload(data.artists),
    isActive,
  };
}

export function buildCreateEventPayload(data: EventFormData, _mode: EventFormMode) {
  return {
    name: data.name,
    description: data.description || undefined,
    artist: data.artist,
    tour: data.tour || undefined,
    venue: data.venue,
    address: data.address || undefined,
    eventDate: data.eventDate,
    eventTime: data.eventTime,
    imageUrl: data.imageUrl || "",
    imagePosX: data.imagePosX,
    imagePosY: data.imagePosY,
    imageZoom: data.imageZoom,
    maxCapacity: Number(data.maxCapacity) || 0,
    salesStartDate: toEventSalesIso(data.salesStartDate),
    salesEndDate: toEventSalesIso(data.salesEndDate),
    organizationId: data.organizationId || undefined,
    ...eventExtrasPayload(data),
    ticketTypes: data.ticketTypes.map((tt) => ticketPayloadFields(tt, data)),
  };
}

export function buildUpdateEventPayload(data: EventFormData, mode: EventFormMode) {
  return {
    name: data.name,
    description: data.description || undefined,
    artist: data.artist,
    tour: data.tour || undefined,
    venue: data.venue,
    address: data.address || undefined,
    eventDate: data.eventDate,
    eventTime: data.eventTime,
    imageUrl: data.imageUrl || "",
    imagePosX: data.imagePosX,
    imagePosY: data.imagePosY,
    imageZoom: data.imageZoom,
    maxCapacity: Number(data.maxCapacity) || 0,
    salesStartDate: toEventSalesIso(data.salesStartDate),
    salesEndDate: toEventSalesIso(data.salesEndDate),
    ...eventExtrasPayload(data),
    ...(mode === "admin" && data.organizationId
      ? { organizationId: data.organizationId }
      : mode === "organizer"
        ? { organizationId: data.organizationId || undefined }
        : {}),
    ticketTypes: data.ticketTypes.map((tt) => ({
      ...(tt.id ? { id: tt.id } : {}),
      ...ticketPayloadFields(tt, data),
    })),
  };
}
